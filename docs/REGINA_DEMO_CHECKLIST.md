# Demo NutriCalc — Checklist para sesión con Regina

## Casos a probar (en orden)

### 1. Paciente sano simple
- Nombre: Manuel (existente en BD)
- Verificar: VCT, distribución de macros, alertas razonables

### 2. Paciente embarazada
- Crear: F 28a, 1.62m, 70kg, pregest 60kg, T2, sin comorbilidades
- Verificar:
  - [ ] Aparece campo peso pregestacional
  - [ ] VCT incluye +285 kcal
  - [ ] Hierro target = 27 mg (DRI embarazo)

### 3. Embarazada con diabetes gestacional y anemia
- Misma paciente + 'diabetes_gestational' + 'iron_deficiency_anemia'
- Verificar:
  - [ ] Hierro target = 40.5 mg (27 × 1.5)
  - [ ] CHO bajado a 40-50%
  - [ ] Hierro absorbible visible en plan

### 4. Adulto mayor con HTA
- Crear: F 70a, 1.58m, 72kg, HTA
- Verificar:
  - [ ] Badge "Adulto mayor" auto-detectado
  - [ ] Peso saludable = 63.6 kg (IMC 25.5)
  - [ ] Sodio target = 1500 mg
  - [ ] Calcio target = 1200 mg

### 5. Rosa Test compleja
- Ver test B.7
- Verificar manualmente todos los merges

### 6. Sistema de alertas (caso C7 sangre de pollo)
- Plan con 120g de sangre de pollo
- Verificar el nivel de alerta del hierro (ver pregunta 4 para Regina)

### 7. Caso de bloqueo: lactante
- Intentar crear paciente con birth_date hace 6 meses
- Verificar: app bloquea con mensaje claro

## Preguntas explícitas para Regina

Decisiones marcadas `// REVIEW_WITH_REGINA:` en el código:

1. **Umbrales del semáforo (A.1):** ¿los multiplicadores 0.8 / 1.2 / 1.5 son
   apropiados, o prefieres ajustarlos?

2. **IMC saludable adultos mayores (B.1):** ¿usamos rango 22-27 para ≥60a, o
   prefieres clasificación OMS estándar (18.5-24.9) también para mayores?

3. **Corte "subalimentación" (B.4):** ¿70% del VCT es el punto correcto, o
   prefieres 80%?

4. **Hierro alto natural (inconsistencia detectada en spec A.1):** el algoritmo
   de la spec clasifica hierro 71 mg con UL 45 como **`exceeded`** (71 > 45×1.5),
   pero el caso clínico "sangre de pollo" sugiere tolerarlo como aporte natural
   alto. ¿Subimos el factor UL para hierro, lo tratamos como nutriente de
   "aporte natural alto", o se mantiene `exceeded`?

5. **Proteína deportista + adulto mayor (inconsistencia B.6):** la spec espera
   que deportista gane (1.4 g/kg) sobre adulto mayor (1.2). El `mergeOverrides`
   actual intersecta rangos → 1.2 g/kg. ¿Cambiamos la regla de merge de proteína
   para que el perfil deportista tenga prioridad?

## Pendientes que dependen de Regina (Grupo C de la auditoría)

Mostrar al final, no implementar antes:

- C4: fórmula peso ajustado para obesidad mórbida
- C12: visualización de agua/hidratación
- C13: plan multi-día
- C14: alimentos custom (productos comerciales)
- C16: historia de peso
- C2, C5, C10, C15, C17: ajustes menores según prioridad
