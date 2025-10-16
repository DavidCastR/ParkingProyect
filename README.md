# Sistema de Parqueadero - Registro de Clientes

## 📋 Descripción
Sistema básico de registro de clientes para un parqueadero que utiliza el esquema de base de datos proporcionado.

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Base de Datos
1. Abrir XAMPP y iniciar MySQL
2. Ir a phpMyAdmin (http://localhost/phpmyadmin)
3. Ejecutar el script `database_init.sql` para crear las tablas

### 3. Ejecutar el Servidor
```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 🔧 Funcionalidades Implementadas

### Registro de Clientes
- **Ruta**: `/registrarcliente`
- **Campos**: nombres, apellidos, email, teléfono (opcional), password
- **Proceso**:
  1. Inserta datos en tabla `PERSONA`
  2. Genera automáticamente un `id_cliente` en tabla `CLIENTE`
  3. Asigna tipo de documento como "CC" por defecto
  4. Genera número de documento temporal único

### Estructura de Datos
- **PERSONA**: Información personal básica
- **CLIENTE**: Relación con PERSONA mediante `id_persona`
- **Número de documento temporal**: Se genera como "TEMP" + timestamp

## 📊 Esquema de Base de Datos
El sistema utiliza las siguientes tablas principales:
- PERSONA
- CLIENTE  
- EMPLEADO
- VEHICULO
- PARQUEADERO
- ESPACIO_PARQUEO
- TICKET
- TARIFA
- FACTURA
- METODO_PAGO

## 🎯 Uso del Sistema

1. **Acceder**: Ir a `http://localhost:3000`
2. **Registrar Cliente**: Hacer clic en "Registrarse como cliente"
3. **Completar Formulario**: Llenar nombres, apellidos, email, teléfono y contraseña
4. **Confirmar**: El sistema mostrará el ID de cliente asignado

## 🔍 Validaciones Implementadas

- **Campos obligatorios**: nombres, apellidos, email, password
- **Email único**: Validación a nivel de base de datos
- **Número de documento único**: Generación automática temporal
- **Manejo de errores**: Respuestas claras en caso de fallos

## 📝 Notas Importantes

- El campo `password` se captura pero no se almacena (pendiente implementar hash)
- El número de documento se genera temporalmente (se puede mejorar para captura manual)
- El sistema está preparado para expandir con más funcionalidades del parqueadero

## 🚨 Solución de Problemas

### Error de Conexión a Base de Datos
- Verificar que XAMPP esté ejecutándose
- Confirmar que la base de datos `parking` existe
- Verificar credenciales en `server.js`

### Error al Registrar
- Verificar que las tablas PERSONA y CLIENTE existan
- Revisar que no haya duplicados en email
- Comprobar logs del servidor para detalles específicos
