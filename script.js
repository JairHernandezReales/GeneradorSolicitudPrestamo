const { jsPDF } = window.jspdf;
let pdfDoc = null;

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

function mostrarVistaPrevia() {
    // Obtener valores del formulario y limpiar los puntos para cálculos
    const nombre = document.getElementById('nombre').value;
    const cedula = document.getElementById('cedula').value;
    const direccion = document.getElementById('direccion').value;
    const telefono = document.getElementById('telefono').value;
    const empresa = document.getElementById('empresa').value;
    const direccionOficina = document.getElementById('direccionOficina').value;
    const ingresos = parseFormattedNumber(document.getElementById('ingresos').value);
    const valorPrestamo = parseFormattedNumber(document.getElementById('valorPrestamo').value);
    const cuotas = document.getElementById('cuotas').value;
    const valorCuota = parseFormattedNumber(document.getElementById('valorCuota').value);
    const totalPagar = parseFormattedNumber(document.getElementById('totalPagar').value);
    const primerVencimiento = document.getElementById('primerVencimiento').value;
    
    // Formatear la fecha
    const fechaFormateada = formatFecha(primerVencimiento);

    // Validar campos obligatorios
    if (!nombre || !cedula || !direccion || !telefono || !empresa || !valorPrestamo) {
        alert('Por favor complete todos los campos obligatorios');
        return;
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

    // Configurar fuente y tamaño base
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(11); // Tamaño base de fuente

    // Tabla de información
    pdfDoc.setFontSize(12); // Tamaño ligeramente mayor para encabezados
    pdfDoc.line(20, 30, 190, 30);

    // Primera fila
    pdfDoc.setFontSize(8); // Tamaño base de fuente
    pdfDoc.text('NOMBRE DEL DEUDOR: ', 20, 40);
    pdfDoc.setFontSize(11); // Volver al tamaño normal
    pdfDoc.text(nombre, 70, 40);
    pdfDoc.setFontSize(8);
    pdfDoc.text('C.C. N°: ', 150, 40);
    pdfDoc.setFontSize(11); // Volver al tamaño normal
    pdfDoc.text(cedula, 165, 40);

    // Segunda fila
    pdfDoc.setFontSize(8);
    pdfDoc.text('DIRECCIÓN RESIDENCIA: ', 20, 50);
    pdfDoc.setFontSize(11);
    pdfDoc.text(direccion, 70, 50);
    pdfDoc.setFontSize(8);
    pdfDoc.text('TEL:', 150, 50);
    pdfDoc.setFontSize(11); // Volver al tamaño normal
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
    pdfDoc.setFontSize(11); // Volver al tamaño normal
    pdfDoc.text('$ ' + document.getElementById('valorPrestamo').value, 165, 80);

    pdfDoc.line(20, 85, 190, 85);

    // Autorización de descuento - Título más grande
    pdfDoc.setFontSize(10);
    pdfDoc.text('AUTORIZACIÓN PARA DESCUENTO POR NÓMINA', 60, 95);
    pdfDoc.setFontSize(11); // Texto normal

    const textoAutorizacion =
        `Yo, ${nombre}, mayor de edad, identificado con la cédula de ciudadanía N° ${cedula} de Monteria, AUTORIZO EXPRESA e IRREVOCABLEMENTE a ${empresa}, para que de mi salario me sean descontados en (${cuotas}) cuotas PONER TIPO DE CUOTA cada una por valor de ${valorCuotaTexto} MCTE ($ ${document.getElementById('valorCuota').value}), hasta completar la suma de ${valorTotalPagarTexto} MCTE ($ ${document.getElementById('totalPagar').value}) como pago total a lo acordado, teniendo como primer vencimiento el día ${fechaFormateada}.

Igualmente autorizo a ${empresa} en condición de empleador para que, en el evento de terminación de contrato por cualquier causa, descuente de mi salario, sueldo, ahorro personal, bonificaciones, prestaciones sociales, indemnizaciones a que tenga derecho las cuotas que estén adeudando hasta llegar al saldo final acordado.`;

    pdfDoc.text(textoAutorizacion, 20, 105, {
        maxWidth: 170
    });
    pdfDoc.text('Empleado: _________________________', 20, 160);

    // Autorización empleador - Título más grande
    pdfDoc.setFontSize(10);
    pdfDoc.text('_________________________________________________', 60, 170);
    pdfDoc.text('AUTORIZACIÓN DESCUENTO POR NÓMINA EMPLEADOR', 60, 175);
    pdfDoc.line(20, 182, 190, 182);
    pdfDoc.setFontSize(10); // Tamaño intermedio para subtítulos
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