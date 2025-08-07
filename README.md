# Proyecto Front-End: Sispoiplan

Este proyecto es una aplicación front-end desarrollada con Angular. Está diseñado para gestionar y visualizar datos financieros mediante una interfaz interactiva y responsiva.

## Estructura del Proyecto

La estructura principal del proyecto incluye los siguientes directorios y archivos:

- **src/app**: Contiene la lógica principal de la aplicación.
  - **components/main-components**: Contiene los componentes principales de la aplicación.
    - **form9**: Componente que incluye una tabla de matriz para la gestión de datos financieros.
      - `form9.component.scss`: Estilos específicos para el componente, incluyendo diseño responsivo y personalización de elementos interactivos.
      - `form9.component.html`: Estructura HTML del componente, que define la tabla y los elementos interactivos.
      - `form9.component.ts`: Lógica y funcionalidad del componente, incluyendo manejo de eventos y datos.
  - **services**: Contiene los servicios utilizados para la comunicación con APIs y la gestión de datos.
  - **models**: Define las interfaces y modelos de datos utilizados en la aplicación.

- **src/assets**: Contiene recursos estáticos como imágenes, íconos y archivos de configuración.

- **src/environments**: Contiene configuraciones específicas para diferentes entornos (desarrollo, producción).

- **tsconfig.json**: Configuración principal de TypeScript para el proyecto.
- **tsconfig.spec.json**: Configuración de TypeScript para pruebas unitarias.

## Configuración del Proyecto

### Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes programas:

- [Node.js](https://nodejs.org/)
- [Angular CLI](https://angular.io/cli)

### Instalación

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd sispoiplan
   ```

2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

### Ejecución del Proyecto

Para iniciar el servidor de desarrollo, ejecuta:
```bash
ng serve
```
Esto iniciará la aplicación en `http://localhost:4200`.

### Pruebas Unitarias

Para ejecutar las pruebas unitarias, utiliza:
```bash
ng test
```

## Estilos y Diseño

Los estilos del proyecto están definidos principalmente en archivos SCSS. Por ejemplo:

- **`form9.component.scss`**: Contiene estilos personalizados para la tabla de matriz utilizada en el componente `Form9Component`. Incluye diseño responsivo, personalización de columnas y filas, y estilos para elementos interactivos como botones y selects.

## Contribución

Si deseas contribuir al proyecto, sigue estos pasos:

1. Crea un fork del repositorio.
2. Crea una nueva rama para tu funcionalidad o corrección:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Realiza tus cambios y crea un commit:
   ```bash
   git commit -m "Descripción de los cambios"
   ```
4. Envía tus cambios al repositorio remoto:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. Abre un pull request en el repositorio original.

## Licencia

Este proyecto está bajo la licencia [MIT](https://opensource.org/licenses/MIT).
