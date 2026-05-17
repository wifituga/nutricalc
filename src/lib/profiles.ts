import type { ProfileLimits } from './types';

// Clinical profiles with nutrient limits.
// Values based on international guidelines (KDOQI, ADA, AHA).
// IMPORTANT: The clinic must validate these against their own reference guides before production use.
export const SYSTEM_PROFILES: Record<string, { name: string; limits: ProfileLimits }> = {
  adulto_sano: {
    name: 'Adulto sano',
    limits: {
      energia_kcal: { max: 2200, min: 1600, label: 'Energía', unit: 'kcal' },
      proteinas_g: { min: 46, max: 100, label: 'Proteínas', unit: 'g' },
      grasa_g: { max: 78, label: 'Grasa total', unit: 'g' },
      carbohidratos_disponibles_g: { min: 130, max: 325, label: 'Carbohidratos disponibles', unit: 'g' },
      fibra_g: { min: 25, label: 'Fibra', unit: 'g' },
      sodio_mg: { max: 2300, label: 'Sodio', unit: 'mg' },
      calcio_mg: { min: 1000, max: 2500, label: 'Calcio', unit: 'mg' },
      hierro_mg: { min: 8, max: 45, label: 'Hierro', unit: 'mg' },
      vitamina_c_mg: { min: 75, label: 'Vitamina C', unit: 'mg' },
    },
  },

  renal_predialisis: {
    name: 'Renal pre-diálisis',
    limits: {
      energia_kcal: { min: 1800, max: 2200, label: 'Energía', unit: 'kcal' },
      proteinas_g: { max: 50, min: 35, label: 'Proteínas', unit: 'g' },
      grasa_g: { max: 70, label: 'Grasa total', unit: 'g' },
      sodio_mg: { max: 1500, label: 'Sodio', unit: 'mg' },
      potasio_mg: { max: 2000, label: 'Potasio', unit: 'mg' },
      fosforo_mg: { max: 800, label: 'Fósforo', unit: 'mg' },
      fibra_g: { min: 20, label: 'Fibra', unit: 'g' },
      calcio_mg: { max: 2000, label: 'Calcio', unit: 'mg' },
    },
  },

  renal_dialisis: {
    name: 'Renal en diálisis',
    limits: {
      energia_kcal: { min: 1800, max: 2500, label: 'Energía', unit: 'kcal' },
      proteinas_g: { min: 70, max: 100, label: 'Proteínas', unit: 'g' },
      grasa_g: { max: 80, label: 'Grasa total', unit: 'g' },
      sodio_mg: { max: 2000, label: 'Sodio', unit: 'mg' },
      potasio_mg: { max: 2500, label: 'Potasio', unit: 'mg' },
      fosforo_mg: { max: 1200, label: 'Fósforo', unit: 'mg' },
      calcio_mg: { max: 2000, label: 'Calcio', unit: 'mg' },
    },
  },

  diabetes: {
    name: 'Diabetes',
    limits: {
      energia_kcal: { min: 1500, max: 1800, label: 'Energía', unit: 'kcal' },
      proteinas_g: { min: 50, max: 80, label: 'Proteínas', unit: 'g' },
      grasa_g: { max: 55, label: 'Grasa total', unit: 'g' },
      carbohidratos_disponibles_g: { max: 195, min: 130, label: 'Carbohidratos disponibles', unit: 'g' },
      fibra_g: { min: 25, label: 'Fibra', unit: 'g' },
      sodio_mg: { max: 2300, label: 'Sodio', unit: 'mg' },
    },
  },

  hipertension: {
    name: 'Hipertensión',
    limits: {
      energia_kcal: { min: 1600, max: 2000, label: 'Energía', unit: 'kcal' },
      proteinas_g: { min: 50, max: 80, label: 'Proteínas', unit: 'g' },
      grasa_g: { max: 65, label: 'Grasa total', unit: 'g' },
      sodio_mg: { max: 1500, label: 'Sodio', unit: 'mg' },
      potasio_mg: { min: 3500, label: 'Potasio', unit: 'mg' },
      fibra_g: { min: 25, label: 'Fibra', unit: 'g' },
      calcio_mg: { min: 1000, label: 'Calcio', unit: 'mg' },
    },
  },

  custom: {
    name: 'Personalizado',
    limits: {},
  },
};
