const { jsPDF } = window.jspdf;
let pdfDoc = null;

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBYvhtqP59OzgUFapATW8juXDCpT1QdN8Q",
    authDomain: "generadorsolicitudprestamo.firebaseapp.com",
    projectId: "generadorsolicitudprestamo",
    storageBucket: "generadorsolicitudprestamo.firebasestorage.app",
    messagingSenderId: "19478179592",
    appId: "1:19478179592:web:3aae0706ca26a2ce2c46bd",
    measurementId: "G-B4NH3TWBPP"
  };

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Función para calcular el valor de la cuota (PAGO)
function calcularCuota(valorPrestamo, tasaInteres, numeroCuotas) {
    // Convertir tasa de interés mensual a decimal (3% -> 0.03)
    const tasaDecimal = tasaInteres / 100;
    
    // Fórmula de cálculo de cuota: P = (VA * i) / (1 - (1 + i)^-n)
    const cuota = (valorPrestamo * tasaDecimal) / (1 - Math.pow(1 + tasaDecimal, -numeroCuotas));
    
    return cuota;
}

// Función para calcular el total a pagar
function calcularTotalPagar(valorPrestamo, tasaInteres, numeroCuotas) {
    const tasaDecimal = tasaInteres / 100;
    const cuota = (valorPrestamo * tasaDecimal) / (1 - Math.pow(1 + tasaDecimal, -numeroCuotas));
    
    // Verificación para evitar NaN en casos extremos
    if (isNaN(cuota)) {
        return valorPrestamo; // Si no se puede calcular, devolver al menos el capital
    }
    
    return cuota * numeroCuotas;
}

// Función para generar la tabla de amortización (para verificación)
function generarTablaAmortizacion(valorPrestamo, tasaInteres, numeroCuotas) {
    const tasaDecimal = tasaInteres / 100;
    const cuota = calcularCuota(valorPrestamo, tasaInteres, numeroCuotas);
    let saldo = valorPrestamo;
    let totalIntereses = 0;
    
    console.log("Tabla de Amortización:");
    console.log("Cuota | Capital | Interés | Saldo");
    
    for (let i = 1; i <= numeroCuotas; i++) {
        const interes = saldo * tasaDecimal;
        const capital = cuota - interes;
        saldo -= capital;
        totalIntereses += interes;
        
        console.log(`${i} | ${capital.toFixed(2)} | ${interes.toFixed(2)} | ${saldo.toFixed(2)}`);
    }
    
    console.log(`Total intereses: ${totalIntereses.toFixed(2)}`);
    console.log(`Total pagado: ${(valorPrestamo + totalIntereses).toFixed(2)}`);
    
    return valorPrestamo + totalIntereses;
}

// Función para actualizar los cálculos automáticamente
function actualizarCalculos() {
    const valorPrestamo = parseFormattedNumber(document.getElementById('valorPrestamo').value) || 0;
    let cuotas = parseInt(document.getElementById('cuotas').value) || 1;
    const tasaInteres = parseFloat(document.getElementById('tasaInteres').value) || 0;
    const tipoCuota = document.getElementById('tipoCuota').value;
    
    // Ajustar cuotas y tasa si es quincenal
    let cuotasCalculo = cuotas;
    if (tipoCuota === 'QUINCENALES') {
        cuotasCalculo = Math.ceil(cuotas / 2); // Convertir quincenas a meses para el cálculo
    }
    
    if (valorPrestamo > 0 && cuotas > 0 && tasaInteres >= 0) {
        // Calcular valor cuota (basado en meses)
        let valorCuota = calcularCuota(valorPrestamo, tasaInteres, cuotasCalculo);
        
        // Si es quincenal, dividir la cuota mensual en 2
        if (tipoCuota === 'QUINCENALES') {
            valorCuota = valorCuota / 2;
        }
        
        document.getElementById('valorCuota').value = formatNumber(Math.round(valorCuota));
        
        // Calcular total a pagar
        const totalPagar = valorCuota * cuotas;
        document.getElementById('totalPagar').value = formatNumber(Math.round(totalPagar));
        
        // Para verificación (puedes comentar esto en producción)
        generarTablaAmortizacion(valorPrestamo, tasaInteres, cuotasCalculo);
    } else {
        // Limpiar campos si los valores no son válidos
        document.getElementById('valorCuota').value = '';
        document.getElementById('totalPagar').value = '';
    }
}

// Agregar event listeners para cálculo automático
document.addEventListener('DOMContentLoaded', function() {
    // Escuchar cambios en todos los campos relevantes
    document.getElementById('valorPrestamo').addEventListener('input', actualizarCalculos);
    document.getElementById('cuotas').addEventListener('input', actualizarCalculos);
    document.getElementById('tasaInteres').addEventListener('input', actualizarCalculos);
    document.getElementById('tipoCuota').addEventListener('change', actualizarCalculos); // Nuevo listener
    
    // Calcular inicialmente si hay valores
    actualizarCalculos();
});

// Función para guardar los datos del usuario en Firestore
async function guardarUsuario() {
    const nombre = document.getElementById('nombre').value;
    const cedula = document.getElementById('cedula').value;
    const ciudadCedula = document.getElementById('ciudadCedula').value;
    const direccion = document.getElementById('direccion').value;
    const telefono = document.getElementById('telefono').value;
    const empresa = document.getElementById('empresa').value;
    const direccionOficina = document.getElementById('direccionOficina').value;
    
    if (!nombre || !cedula) {
        console.error('Nombre y cédula son campos obligatorios');
        return;
    }

    try {
        await db.collection('usuarios').doc(cedula).set({
            nombre,
            cedula,
            ciudadCedula,
            direccion,
            telefono,
            empresa,
            direccionOficina,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Usuario guardado/actualizado correctamente');
        console.log('Datos guardados correctamente');
    } catch (error) {
        console.error('Error al guardar el usuario:', error);
    }
}

// Función para buscar usuario por cédula
async function buscarPorCedula() {
    const cedula = document.getElementById('cedula').value;
    
    if (!cedula) {
        alert('Por favor ingrese un número de cédula');
        return;
    }

    try {
        const doc = await db.collection('usuarios').doc(cedula).get();
        
        if (doc.exists) {
            const usuario = doc.data();
            // Llenar los campos con los datos del usuario
            document.getElementById('nombre').value = usuario.nombre || '';
            document.getElementById('ciudadCedula').value = usuario.ciudadCedula || '';
            document.getElementById('direccion').value = usuario.direccion || '';
            document.getElementById('telefono').value = usuario.telefono || '';
            document.getElementById('empresa').value = usuario.empresa || '';
            document.getElementById('direccionOficina').value = usuario.direccionOficina || '';
            
            console.log('Usuario encontrado:', usuario);
        } else {
            console.log('No se encontró usuario con esta cédula');
            alert('No se encontró usuario con esta cédula. Complete los datos para crear un nuevo registro.');
        }
    } catch (error) {
        console.error('Error al buscar usuario:', error);
        alert('Ocurrió un error al buscar el usuario');
    }
}

// Función para formatear números con separadores de miles
function formatNumber(num) {
    return num.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Función para convertir el valor formateado a número
function parseFormattedNumber(str) {
    return parseFloat(str.replace(/\./g, ''));
}

// Función para formatear fecha a "día de mes de año"
function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const fecha = new Date(fechaStr);
    const dia = fecha.getDate()+1;
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    return `${dia} de ${mes} de ${año}`;
}

// Aplicar formato al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const numericInputs = document.querySelectorAll('.numeric-input');
    
    numericInputs.forEach(input => {
        if (input.value) {
            const numValue = parseFloat(input.value.replace(/\./g, ''));
            if (!isNaN(numValue)) {
                input.value = formatNumber(numValue);
            }
        }
    });

    // Manejar el evento input para formatear mientras se escribe
    numericInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const cursorPosition = e.target.selectionStart;
            const originalLength = e.target.value.length;
            
            // Obtener valor sin puntos
            let value = e.target.value.replace(/\./g, '');
            
            // Verificar si es un número válido
            if (/^\d*$/.test(value)) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    const formattedValue = formatNumber(numValue);
                    e.target.value = formattedValue;
                    
                    // Ajustar la posición del cursor
                    const newLength = formattedValue.length;
                    const lengthDiff = newLength - originalLength;
                    e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
                }
            } else {
                // Si no es un número válido, mantener solo los dígitos
                e.target.value = value.replace(/\D/g, '');
            }
        });
    });
});

// Función para convertir números a letras
function numeroALetras(numero) {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    
    let entero = Math.floor(numero);
    let decimal = Math.round((numero - entero) * 100);
    
    if (entero === 0) return 'CERO';
    if (entero < 10) return unidades[entero];
    if (entero < 20) return especiales[entero - 10];
    if (entero < 100) {
        let decena = Math.floor(entero / 10);
        let unidad = entero % 10;
        return decenas[decena] + (unidad !== 0 ? ' Y ' + unidades[unidad] : '');
    }
    if (entero === 100) return 'CIEN';
    if (entero < 1000) {
        let centena = Math.floor(entero / 100);
        let resto = entero % 100;
        
        // Corrección para quinientos
        if (centena === 5) {
            return 'QUINIENTOS' + (resto !== 0 ? ' ' + numeroALetras(resto) : '');
        }
        // Corrección para setecientos
        else if (centena === 7) {
            return 'SETECIENTOS' + (resto !== 0 ? ' ' + numeroALetras(resto) : '');
        }
        // Corrección para novecientos
        else if (centena === 9) {
            return 'NOVECIENTOS' + (resto !== 0 ? ' ' + numeroALetras(resto) : '');
        }
        // Resto de casos
        else {
            return (centena === 1 ? 'CIENTO' : unidades[centena] + 'CIENTOS') + 
                   (resto !== 0 ? ' ' + numeroALetras(resto) : '');
        }
    }
    if (entero === 1000) return 'MIL';
    if (entero < 1000000) {
        let millar = Math.floor(entero / 1000);
        let resto = entero % 1000;
        return (millar === 1 ? 'MIL' : numeroALetras(millar) + ' MIL') + 
               (resto !== 0 ? ' ' + numeroALetras(resto) : '');
    }
    if (entero === 1000000) return 'UN MILLÓN';
    if (entero < 1000000000) {
        let millon = Math.floor(entero / 1000000);
        let resto = entero % 1000000;
        return (millon === 1 ? 'UN MILLÓN' : numeroALetras(millon) + ' MILLONES') + 
               (resto !== 0 ? ' ' + numeroALetras(resto) : '');
    }
    return 'NUMERO DEMASIADO GRANDE';
}

async function mostrarVistaPrevia() {
    // Primero guardamos los datos del usuario
    await guardarUsuario();
    // Obtener valores del formulario y limpiar los puntos para cálculos
    const nombre = document.getElementById('nombre').value;
    const cedula = document.getElementById('cedula').value;
    const ciudadCedula = document.getElementById('ciudadCedula').value;
    const direccion = document.getElementById('direccion').value;
    const telefono = document.getElementById('telefono').value;
    const empresa = document.getElementById('empresa').value;
    const direccionOficina = document.getElementById('direccionOficina').value;
    const ingresos = parseFormattedNumber(document.getElementById('ingresos').value);
    const valorPrestamo = parseFormattedNumber(document.getElementById('valorPrestamo').value);
    const cuotas = parseInt(document.getElementById('cuotas').value);
    const tipoCuota = document.getElementById('tipoCuota').value;
    const valorCuota = parseFormattedNumber(document.getElementById('valorCuota').value);
    const totalPagar = parseFormattedNumber(document.getElementById('totalPagar').value);
    const primerVencimiento = document.getElementById('primerVencimiento').value;
    const tasaInteres = parseFloat(document.getElementById('tasaInteres').value) || 0;
    
    // Formatear la fecha
    const fechaFormateada = formatFecha(primerVencimiento);

    // Validar campos obligatorios
    if (!nombre || !cedula || !direccion || !telefono || !empresa || !valorPrestamo) {
        alert('Por favor complete todos los campos obligatorios');
        return;
    }

    // Función para formatear números con puntos de mil y símbolo de dólar
    function formatCurrency(num) {
        return '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&.');
    }

    // Función para determinar si necesita "DE" antes de PESOS (solo para millones exactos)
    function formatearMoneda(numero, texto) {
        const entero = Math.floor(numero);
        return texto + (entero % 1000000 === 0 && entero >= 1000000 ? ' DE PESOS' : ' PESOS');
    }

    const valorTotalPagarTexto = formatearMoneda(totalPagar, numeroALetras(totalPagar));
    const valorCuotaTexto = formatearMoneda(valorCuota, numeroALetras(valorCuota));

    // Crear PDF con orientación vertical y unidades en milímetros
    pdfDoc = new jsPDF('p', 'mm', 'a4');

    // PRIMERA PÁGINA - SOLICITUD DE PRÉSTAMO
    // Configurar fuente y tamaño base
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(11);

    // Tabla de información
    pdfDoc.setFontSize(12);
    pdfDoc.line(20, 30, 190, 30);

    // Primera fila
    pdfDoc.setFontSize(8);
    pdfDoc.text('NOMBRE DEL DEUDOR: ', 20, 40);
    pdfDoc.setFontSize(11);
    pdfDoc.text(nombre, 70, 40);
    pdfDoc.setFontSize(8);
    pdfDoc.text('C.C. N°: ', 150, 40);
    pdfDoc.setFontSize(11);
    pdfDoc.text(cedula, 165, 40);

    // Segunda fila
    pdfDoc.setFontSize(8);
    pdfDoc.text('DIRECCIÓN RESIDENCIA: ', 20, 50);
    pdfDoc.setFontSize(11);
    pdfDoc.text(direccion, 70, 50);
    pdfDoc.setFontSize(8);
    pdfDoc.text('TEL:', 150, 50);
    pdfDoc.setFontSize(11);
    pdfDoc.text(telefono, 165, 50);

    // Tercera fila
    pdfDoc.setFontSize(8);
    pdfDoc.text('EMPRESA LABORAL: ', 20, 60);
    pdfDoc.setFontSize(11);
    pdfDoc.text(empresa, 70, 60);
    pdfDoc.setFontSize(8);
    pdfDoc.text('TEL:', 150, 60);

    // Cuarta fila
    pdfDoc.setFontSize(8);
    pdfDoc.text('DIRECCIÓN OFICINA: ', 20, 70);
    pdfDoc.setFontSize(11);
    pdfDoc.text(direccionOficina, 70, 70);
    pdfDoc.setFontSize(8);
    pdfDoc.text('TEL:', 150, 70);

    // Quinta fila
    pdfDoc.setFontSize(8);
    pdfDoc.text('INGRESOS: ', 20, 80);
    pdfDoc.setFontSize(11);
    pdfDoc.text('$ ' + document.getElementById('ingresos').value, 70, 80);
    pdfDoc.setFontSize(8);
    pdfDoc.text('V.P: ', 150, 80);
    pdfDoc.setFontSize(11);
    pdfDoc.text('$ ' + document.getElementById('valorPrestamo').value, 165, 80);

    pdfDoc.line(20, 85, 190, 85);

    // Autorización de descuento
    pdfDoc.setFontSize(10);
    pdfDoc.text('AUTORIZACIÓN PARA DESCUENTO POR NÓMINA', 60, 95);
    pdfDoc.setFontSize(11);

    const textoAutorizacion =
        `Yo, ${nombre}, mayor de edad, identificado con la cédula de ciudadanía N° ${cedula} de ${ciudadCedula}, AUTORIZO EXPRESA e IRREVOCABLEMENTE a ${empresa}, para que de mi salario me sean descontados en (${cuotas}) cuotas ${tipoCuota} cada una por valor de ${valorCuotaTexto} MCTE ($ ${document.getElementById('valorCuota').value}), hasta completar la suma de ${valorTotalPagarTexto} MCTE ($ ${document.getElementById('totalPagar').value}) como pago total a lo acordado, teniendo como primer vencimiento el día ${fechaFormateada}.

Igualmente autorizo a ${empresa} en condición de empleador para que, en el evento de terminación de contrato por cualquier causa, descuente de mi salario, sueldo, ahorro personal, bonificaciones, prestaciones sociales, indemnizaciones a que tenga derecho las cuotas que estén adeudando hasta llegar al saldo final acordado.`;

    pdfDoc.text(textoAutorizacion, 20, 105, {
        maxWidth: 170,
        align: 'justify'
    });
    pdfDoc.text('___________________________', 20, 170);
    pdfDoc.text('FIRMA EMPLEADO', 20, 175);

    // Autorización empleador
    pdfDoc.setFontSize(10);
    pdfDoc.text('_________________________________________________', 90, 170);
    pdfDoc.text('AUTORIZACIÓN DESCUENTO POR NÓMINA EMPLEADOR', 90, 175);
    pdfDoc.line(20, 182, 190, 182);
    pdfDoc.setFontSize(10);
    pdfDoc.text('Letra de cambio N°__________', 20, 190);
    pdfDoc.text(`Valor del préstamo: $ ______________________`, 20, 200);

    const textoLetra =
        `Lugar y fecha de creación: _________________________________________________________________
Señor ___________________________________________________ (Girado) pagará incondicionalmente a __________________________________________________________________ (Beneficiario), la suma de _______________________________________________________ M/C ($ ___________________), el día ______________________________________, en ________________________________.

El girado reconocerá a favor del beneficiario, intereses durante el plazo de __________ por ciento (_____%) mensuales, pagaderos durante los primeros _________ (_______) de cada mes, e intereses durante la mora de ________ por ciento (_____%) mensuales.`;

    pdfDoc.text(textoLetra, 20, 210, {
        maxWidth: 170
    });
    pdfDoc.text('ACEPTO: ___________________________________________', 20, 260);
    pdfDoc.text('Nombre GIRADO: ____________________________________', 20, 270);
    pdfDoc.text('S.s: __________________________', 130, 270);
    pdfDoc.text('C.C: ______________________________________________', 20, 280);
    pdfDoc.text('C.C N°: _______________________', 130, 280);

// SEGUNDA PÁGINA - TABLA DE AMORTIZACIÓN
pdfDoc.addPage();
pdfDoc.setFontSize(14);
pdfDoc.text('TABLA DE AMORTIZACIÓN', 70, 20);

// Función especial para tabla de amortización (sin decimales)
function formatTableCurrency(num) {
    return '$' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Información del préstamo (CON decimales como antes)
pdfDoc.setFontSize(10);
pdfDoc.text(`Préstamo: ${formatCurrency(valorPrestamo)}`, 20, 30);
pdfDoc.text(`Tasa interés: ${tasaInteres}%`, 65, 30);
pdfDoc.text(`Plazo: ${cuotas} cuotas ${tipoCuota.toLowerCase()}`, 97, 30);
pdfDoc.text(`Valor cuota: ${formatCurrency(valorCuota)}`, 150, 30);

// Encabezados de la tabla
pdfDoc.setFontSize(10);
pdfDoc.text('CUOTA', 20, 45);
pdfDoc.text('VALOR CUOTA', 50, 45);
pdfDoc.text('INTERESES', 90, 45);
pdfDoc.text('CAPITAL', 130, 45);
pdfDoc.text('SALDO', 170, 45);
pdfDoc.line(20, 47, 190, 47);

// Generar datos de la tabla (con valores redondeados)
const cuotaMostrar = valorCuota;
let saldo = valorPrestamo;
let totalIntereses = 0;
let yPosition = 55;
const esQuincenal = tipoCuota === 'QUINCENALES';

// Variables para manejar quincenas
let interesMensual = 0;
let capitalMensual = 0;

for (let i = 1; i <= cuotas; i++) {
    let interes, capital;
    
    if (esQuincenal) {
        const quincena = i % 2 === 1 ? 1 : 2;
        
        if (quincena === 1) {
            interesMensual = saldo * (tasaInteres / 100);
            capitalMensual = (cuotaMostrar * 2) - interesMensual;
            
            // Dividir y redondear solo para visualización
            interes = Math.round(interesMensual / 2);
            capital = Math.round(capitalMensual / 2);
        } else {
            interes = Math.round(interesMensual / 2);
            capital = Math.round(capitalMensual / 2);
        }
    } else {
        interes = Math.round(saldo * (tasaInteres / 100));
        capital = Math.round(cuotaMostrar - interes);
    }
    
    saldo -= capital;
    totalIntereses += interes;
    
    // Ajuste final para saldo cero
    if (i === cuotas) {
        saldo = 0;
    }
    
    // Dibujar fila con valores SIN decimales
    pdfDoc.text(i.toString(), 20, yPosition);
    pdfDoc.text(formatTableCurrency(cuotaMostrar), 50, yPosition);
    pdfDoc.text(formatTableCurrency(interes), 90, yPosition);
    pdfDoc.text(formatTableCurrency(capital), 130, yPosition);
    pdfDoc.text(formatTableCurrency(saldo), 170, yPosition);
    
    yPosition += 7;
    
    // Manejo de paginación
    if (yPosition > 270 && i < cuotas) {
        pdfDoc.addPage();
        yPosition = 20;
        
        // Volver a dibujar encabezados
        pdfDoc.setFontSize(10);
        pdfDoc.text('CUOTA', 20, yPosition);
        pdfDoc.text('VALOR CUOTA', 50, yPosition);
        pdfDoc.text('INTERESES', 90, yPosition);
        pdfDoc.text('CAPITAL', 130, yPosition);
        pdfDoc.text('SALDO', 170, yPosition);
        pdfDoc.line(20, yPosition + 2, 190, yPosition + 2);
        yPosition += 10;
    }
}

// Totales al final (SIN decimales)
pdfDoc.setFontSize(11);
pdfDoc.text('TOTAL PAGADO:', 20, yPosition + 10);
pdfDoc.text(formatTableCurrency(cuotaMostrar * cuotas), 50, yPosition + 10);
    
    // Mostrar vista previa
    const pdfPreview = document.getElementById('pdf-preview');
    pdfPreview.src = pdfDoc.output('datauristring');
    
    // Mostrar el contenedor de vista previa
    document.getElementById('preview-container').style.display = 'block';
    
    // Desplazarse a la vista previa
    document.getElementById('preview-container').scrollIntoView({ behavior: 'smooth' });
}

function descargarPDF() {
    if (pdfDoc) {
        const nombre = document.getElementById('nombre').value;
        pdfDoc.save('Solicitud_Prestamo_' + nombre.split(' ')[0] + '_' + nombre.split(' ')[2] + '.pdf');
    }
}

function cerrarVistaPrevia() {
    document.getElementById('preview-container').style.display = 'none';
}