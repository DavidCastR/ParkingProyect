-- Script de inicialización de la base de datos Parking
-- Ejecutar este script para crear las tablas necesarias

CREATE DATABASE IF NOT EXISTS parking;
USE parking;

-- Tabla PERSONA
CREATE TABLE IF NOT EXISTS PERSONA (
    id_persona INT PRIMARY KEY AUTO_INCREMENT,
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(80)
);

-- Tabla CLIENTE
CREATE TABLE IF NOT EXISTS CLIENTE (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    id_persona INT NOT NULL,
    password VARCHAR(255) NOT NULL,
    CONSTRAINT FK_CLIENTE_PERSONA
        FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla EMPLEADO
CREATE TABLE IF NOT EXISTS EMPLEADO (
    id_empleado INT PRIMARY KEY AUTO_INCREMENT,
    id_persona INT NOT NULL,
    id_carnet VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT FK_EMPLEADO_PERSONA
        FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla PARQUEADERO
CREATE TABLE IF NOT EXISTS PARQUEADERO (
    id_parqueadero INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(150) NOT NULL,
    horario VARCHAR(50),
    capacidad_total INT,
    tipo_parqueadero VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'Activo'
);

-- Tabla ESPACIO_PARQUEO
CREATE TABLE IF NOT EXISTS ESPACIO_PARQUEO (
    id_espacio INT PRIMARY KEY AUTO_INCREMENT,
    numero_espacio VARCHAR(10) NOT NULL,
    tipo_espacio VARCHAR(30),
    estado VARCHAR(20) DEFAULT 'Disponible',
    id_parqueadero INT NOT NULL,
    CONSTRAINT FK_ESPACIO_PARQUEO_PARQUEADERO
        FOREIGN KEY (id_parqueadero) REFERENCES PARQUEADERO(id_parqueadero)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla PROVEEDOR
CREATE TABLE IF NOT EXISTS PROVEEDOR (
    id_proveedor INT PRIMARY KEY AUTO_INCREMENT,
    nombre_proveedor VARCHAR(100) NOT NULL,
    tipo_servicio VARCHAR(60),
    telefono VARCHAR(20),
    email VARCHAR(80),
    id_parqueadero INT NOT NULL,
    CONSTRAINT FK_PROVEEDOR_PARQUEADERO
        FOREIGN KEY (id_parqueadero) REFERENCES PARQUEADERO(id_parqueadero)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla VEHICULO
CREATE TABLE IF NOT EXISTS VEHICULO (
    id_vehiculo INT PRIMARY KEY AUTO_INCREMENT,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(40),
    modelo VARCHAR(40),
    tipo_vehiculo VARCHAR(30),
    color VARCHAR(20),
    año_modelo INT,
    estado VARCHAR(20) DEFAULT 'Activo',
    id_cliente INT NOT NULL,
    CONSTRAINT FK_VEHICULO_CLIENTE
        FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla TARIFA
CREATE TABLE IF NOT EXISTS TARIFA (
    id_tarifa INT PRIMARY KEY AUTO_INCREMENT,
    tipo_tarifa VARCHAR(30) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    tipo_vehiculo VARCHAR(30)
);

-- Tabla TICKET
CREATE TABLE IF NOT EXISTS TICKET (
    id_ticket INT PRIMARY KEY AUTO_INCREMENT,
    hora_entrada DATETIME NOT NULL,
    hora_salida DATETIME,
    monto_total DECIMAL(10,2),
    estado_ticket VARCHAR(20) DEFAULT 'Activo',
    id_vehiculo INT NOT NULL,
    id_empleado INT,
    id_espacio INT,
    id_tarifa INT,
    id_parqueadero INT,
    CONSTRAINT FK_TICKET_VEHICULO
        FOREIGN KEY (id_vehiculo) REFERENCES VEHICULO(id_vehiculo)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT FK_TICKET_EMPLEADO
        FOREIGN KEY (id_empleado) REFERENCES EMPLEADO(id_empleado)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT FK_TICKET_ESPACIO_PARQUEO
        FOREIGN KEY (id_espacio) REFERENCES ESPACIO_PARQUEO(id_espacio)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT FK_TICKET_TARIFA
        FOREIGN KEY (id_tarifa) REFERENCES TARIFA(id_tarifa)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT FK_TICKET_PARQUEADERO
        FOREIGN KEY (id_parqueadero) REFERENCES PARQUEADERO(id_parqueadero)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Tabla METODO_PAGO
CREATE TABLE IF NOT EXISTS METODO_PAGO (
    id_metodo_pago INT PRIMARY KEY AUTO_INCREMENT,
    tipo_metodo VARCHAR(30) NOT NULL,
    referencia_pago VARCHAR(100)
);

-- Tabla FACTURA
CREATE TABLE IF NOT EXISTS FACTURA (
    id_factura INT PRIMARY KEY AUTO_INCREMENT,
    fecha_emision DATE NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    estado_factura VARCHAR(20) DEFAULT 'Pendiente',
    id_ticket INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    CONSTRAINT FK_FACTURA_TICKET
        FOREIGN KEY (id_ticket) REFERENCES TICKET(id_ticket)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT FK_FACTURA_METODO_PAGO
        FOREIGN KEY (id_metodo_pago) REFERENCES METODO_PAGO(id_metodo_pago)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla SERVICIO_PROGRAMADO
CREATE TABLE IF NOT EXISTS SERVICIO_PROGRAMADO (
    id_servicio_programado INT PRIMARY KEY AUTO_INCREMENT,
    id_proveedor INT NOT NULL,
    descripcion_servicio TEXT NOT NULL,
    fecha_programada DATE NOT NULL,
    hora_programada TIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'Programado',
    observaciones TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_SERVICIO_PROGRAMADO_PROVEEDOR
        FOREIGN KEY (id_proveedor) REFERENCES PROVEEDOR(id_proveedor)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Insertar datos iniciales

-- Insertar parqueadero principal
INSERT INTO PARQUEADERO (nombre, direccion, horario, capacidad_total, tipo_parqueadero, estado) VALUES
('Parqueadero Central', 'Calle 123 #45-67', '24 horas', 50, 'Mixto', 'Activo');

-- Insertar espacios de parqueo
INSERT INTO ESPACIO_PARQUEO (numero_espacio, tipo_espacio, estado, id_parqueadero) VALUES
('A01', 'Carro', 'Disponible', 1),
('A02', 'Carro', 'Disponible', 1),
('A03', 'Carro', 'Disponible', 1),
('A04', 'Carro', 'Disponible', 1),
('A05', 'Carro', 'Disponible', 1),
('B01', 'Moto', 'Disponible', 1),
('B02', 'Moto', 'Disponible', 1),
('B03', 'Moto', 'Disponible', 1),
('B04', 'Moto', 'Disponible', 1),
('B05', 'Moto', 'Disponible', 1),
('C01', 'Camioneta', 'Disponible', 1),
('C02', 'Camioneta', 'Disponible', 1),
('C03', 'Camioneta', 'Disponible', 1);

-- Insertar tarifas por minuto
INSERT INTO TARIFA (tipo_tarifa, valor_unitario, tipo_vehiculo) VALUES
('Minuto', 70.00, 'Automovil'),
('Minuto', 40.00, 'Motocicleta'),
('Minuto', 100.00, 'Camion'),
('Minuto', 30.00, 'Bicicleta');

-- Insertar métodos de pago
INSERT INTO METODO_PAGO (tipo_metodo, referencia_pago) VALUES
('Efectivo', 'Pago en efectivo'),
('Tarjeta', 'Pago con tarjeta'),
('Transferencia', 'Transferencia bancaria');

-- Insertar usuarios iniciales

-- 1. Cliente Genérico (para vehículos sin cliente específico)
INSERT INTO PERSONA (tipo_documento, numero_documento, nombres, apellidos, telefono, email) VALUES
('CC', '0', 'Cliente', 'Generico', '0', 'noemail');

INSERT INTO CLIENTE (id_persona, password) VALUES
(1, 'nopassword');

-- 2. Juan Empleado (empleado del sistema)
INSERT INTO PERSONA (tipo_documento, numero_documento, nombres, apellidos, telefono, email) VALUES
('CC', '123456789', 'Juan', 'Empleado', '3001234567', 'empleado@parking.com');

INSERT INTO EMPLEADO (id_persona, id_carnet, password_hash) VALUES
(2, 'CARNET001', 'contrasena123');

-- Mostrar mensaje de éxito
SELECT 'Base de datos inicializada correctamente' as mensaje;
