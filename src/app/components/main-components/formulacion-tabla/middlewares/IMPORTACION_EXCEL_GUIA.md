# ## Descripción
La funcionalidad de importación de Excel permite actualizar los datos de actividades de prestaciones económicas desde archivos Excel que han sido generados previamente por el sistema usando la función de exportación.

**IMPORTANTE**: La importación actualiza los datos mostrados en el modal Y los persiste en la base de datos.ía de Importación de Excel - Prestaciones Económicas

## Descripción
La funcionalidad de importación de Excel permite cargar actividades de prestaciones económicas desde archivos Excel que han sido generados previamente por el sistema usando la función de exportación.

## Características Principales

### 🔧 Funcionalidades Disponibles
- ✅ Importación de vista detallada (por dependencias)
- ✅ Importación de vista consolidada 
- ✅ Validación automática de estructura del archivo
- ✅ Vista previa antes de confirmar la importación
- ✅ Manejo de errores y advertencias
- ✅ Protección contra archivos incorrectos

### 📋 Flujo de Trabajo

#### 1. Exportar Plantilla
1. Abrir el modal de "Programación de Prestaciones Económicas"
2. Seleccionar la vista deseada (Detallada o Consolidada)
3. Hacer clic en "Exportar Detallado" o "Exportar Consolidado"
4. El sistema generará un archivo Excel con la estructura correcta

#### 2. Llenar la Plantilla
1. Abrir el archivo Excel exportado
2. **IMPORTANTE**: Solo editar las celdas habilitadas (destacadas en amarillo)
3. **NO modificar**:
   - La estructura de columnas
   - Los encabezados
   - Las celdas bloqueadas (grises)
   - Las fórmulas de totales

#### 3. Importar Datos
1. En el modal, hacer clic en "Importar Excel"
2. Seleccionar el archivo Excel modificado
3. Revisar la vista previa de datos
4. Corregir errores si los hay
5. Confirmar la importación
6. **Los datos se actualizan en el modal Y se guardan en la base de datos**

### 📊 Estructura de Archivos

#### Vista Detallada
**Columnas editables**:
- Metas mensuales (Enero - Diciembre)
- Presupuestos mensuales (Enero - Diciembre)

**Columnas de solo lectura**:
- Dependencia
- Subsidio
- Unidad de Medida
- Totales (calculados automáticamente)

#### Vista Consolidada
**Todas las columnas son de solo lectura** - solo para referencia.

### ⚠️ Validaciones del Sistema

#### Errores Críticos (Bloquean importación):
- ❌ Archivo no es Excel (.xlsx/.xls)
- ❌ Estructura de encabezados incorrecta
- ❌ Subsidio vacío
- ❌ Unidad de medida vacía
- ❌ Valores no numéricos en campos de metas/presupuestos
- ❌ Valores negativos

#### Advertencias (Permiten importación):
- ⚠️ Actualmente no se generan advertencias automáticamente
- ✅ Los valores en 0 son completamente válidos

### 🛡️ Medidas de Seguridad

#### Protección de Celdas
- **Celdas bloqueadas**: Contienen datos de estructura (dependencia, subsidio, etc.)
- **Celdas editables**: Solo valores de metas y presupuestos mensuales
- **Fórmulas protegidas**: Los totales se calculan automáticamente

#### Validaciones de Datos
- Solo se permiten archivos Excel válidos
- Verificación de estructura de encabezados
- Validación de tipos de datos
- Rango de valores permitidos (≥ 0)

### 📈 Comportamiento de la Importación

Al importar, el sistema:
- **Busca coincidencias** por nombre de subsidio y unidad de medida
- **Actualiza metas mensuales** de actividades coincidentes
- **Actualiza presupuestos mensuales** de actividades coincidentes
- **Guarda cambios en la base de datos** usando el servicio de actualización
- **Reagrupa vista por dependencias** automáticamente
- **Regenera vista consolidada** si está activa
- **Muestra resultados detallados** de éxitos y errores
- **Mantiene integridad de datos** con transacciones individuales

### 🔄 Proceso de Importación

1. **Selección de archivo** → Validación de tipo
2. **Procesamiento** → Lectura y validación de estructura
3. **Vista previa** → Muestra datos a importar
4. **Corrección** → Usuario puede eliminar filas problemáticas
5. **Confirmación** → Actualización de datos en el modal
6. **Persistencia** → Guardado automático en la base de datos
7. **Resultado** → Vista actualizada con datos persistidos

### 💡 Consejos y Mejores Prácticas

#### ✅ Hacer:
- Usar siempre plantillas generadas por el sistema
- Verificar datos antes de importar
- Revisar advertencias y errores
- Mantener respaldos de archivos originales

#### ❌ No hacer:
- Modificar la estructura de columnas
- Cambiar encabezados
- Editar celdas bloqueadas
- Usar archivos de otras fuentes

### 🚨 Resolución de Problemas

#### Error: "Estructura de encabezados incorrecta"
- **Causa**: Archivo modificado incorrectamente
- **Solución**: Usar nueva plantilla del sistema

#### Error: "Subsidio es obligatorio"
- **Causa**: Celda de subsidio vacía
- **Solución**: Verificar que todas las filas tengan subsidio

#### Advertencia: "Sin metas/presupuestos válidos"
- **Causa**: Esta advertencia ya no se genera
- **Solución**: Los valores en 0 son completamente válidos

### 📞 Soporte
Si encuentra problemas, verifique:
1. Archivo generado desde el sistema actual
2. Solo celdas editables fueron modificadas
3. Valores numéricos válidos
4. Estructura de encabezados intacta

## Archivos Involucrados

### Servicios
- `excel-import.service.ts` - Lógica de importación y validación
- `excel-export.service.ts` - Generación de plantillas protegidas

### Componente Principal
- `formulacion-ospes-tabla.component.ts` - Interfaz de usuario y coordinación
- `formulacion-ospes-tabla.component.html` - Modal de importación

### Características Técnicas
- **Biblioteca**: ExcelJS para manejo de archivos Excel
- **Validaciones**: Estructura, tipos de datos, rangos
- **Seguridad**: Protección de celdas, validación de archivos
- **UX**: Vista previa, mensajes claros, proceso guiado
