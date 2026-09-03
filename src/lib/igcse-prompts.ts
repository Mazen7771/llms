/**
 * IGCSE Exam Question Prompt Templates
 * Covers Biology (0610) and Chemistry (0620) syllabi
 */

export interface IGCSEContext {
  subject: "biology" | "chemistry";
  subjectName: string;
  unit: string;
  topic: string;
  syllabusCode: string;
  commandWords: string[];
}

export const IGCSE_SUBJECTS: Record<string, IGCSEContext> = {
  biology: {
    subject: "biology",
    subjectName: "Biology",
    unit: "",
    topic: "",
    syllabusCode: "0610",
    commandWords: [
      "state", "identify", "name", "give", "list",
      "describe", "explain", "suggest", "calculate",
      "compare", "contrast", "distinguish", "evaluate",
      "predict", "design", "plan", "outline"
    ],
  },
  chemistry: {
    subject: "chemistry",
    subjectName: "Chemistry",
    unit: "",
    topic: "",
    syllabusCode: "0620",
    commandWords: [
      "state", "identify", "name", "give", "list",
      "describe", "explain", "suggest", "calculate",
      "compare", "contrast", "distinguish", "evaluate",
      "predict", "design", "plan", "outline",
      "define", "measure", "determine"
    ],
  },
};

// ============================================
// BIOLOGY (0610) TOPIC-SPECIFIC PROMPTS
// ============================================

export const BIOLOGY_TOPIC_PROMPTS: Record<string, string> = {
  "characteristics-of-living-organisms": `
IGCSE Biology 0610 - Characteristics of Living Organisms (MRS GREN)
Key concepts: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition
Command words focus: identify, state, describe, explain
Include questions on: MRS GREN criteria, viruses as non-living, cell as basic unit of life`,

  "cell-structure": `
IGCSE Biology 0610 - Cell Structure
Key concepts: Plant vs animal cells, organelles (nucleus, mitochondria, chloroplasts, cell wall, vacuole, ribosomes), specialized cells (root hair, palisade, sperm, egg, neuron), magnification calculations
Command words focus: identify, label, describe, explain, calculate
Include magnification formula: Image size = Actual size × Magnification`,

  "movement-in-and-out-of-cells": `
IGCSE Biology 0610 - Movement In and Out of Cells
Key concepts: Diffusion, osmosis, active transport, water potential, turgid/plasmolysed cells, surface area to volume ratio
Command words focus: describe, explain, predict, calculate
Include: water potential formula, factors affecting diffusion rate`,

  "biological-molecules": `
IGCSE Biology 0610 - Biological Molecules
Key concepts: Carbohydrates (monosaccharides, disaccharides, polysaccharides), lipids, proteins, enzymes, DNA structure, food tests (Benedict's, iodine, biuret, ethanol emulsion)
Command words focus: identify, describe, explain, state
Include: enzyme action (lock and key, induced fit), factors affecting enzyme activity`,

  "enzymes": `
IGCSE Biology 0610 - Enzymes
Key concepts: Protein nature, active site, specificity, factors (temperature, pH, substrate concentration, enzyme concentration), denaturation, industrial uses
Command words focus: describe, explain, interpret graphs, predict
Include: graph interpretation of rate vs temperature/pH/concentration`,

  "plant-nutrition": `
IGCSE Biology 0610 - Plant Nutrition
Key concepts: Photosynthesis equation, leaf structure, limiting factors (light, CO2, temperature), mineral nutrition (nitrogen, magnesium), fertilizer use
Command words focus: write word/symbol equation, describe, explain, investigate
Include: photosynthesis word and balanced symbol equations`,

  "human-nutrition": `
IGCSE Biology 0610 - Human Nutrition
Key concepts: Balanced diet, food groups, deficiency diseases (kwashiorkor, marasmus, scurvy, rickets), digestive system, enzymes (amylase, protease, lipase), absorption (villi, microvilli)
Command words focus: describe, explain, identify, state
Include: enzyme names, substrates, products, optimum pH`,

  "transport-in-plants": `
IGCSE Biology 0610 - Transport in Plants
Key concepts: Xylem and phloem structure/function, transpiration pull, factors affecting transpiration, translocation, root hair adaptation
Command words focus: describe, explain, investigate, predict
Include: cohesion-tension theory, factors affecting transpiration rate`,

  "transport-in-animals": `
IGCSE Biology 0610 - Transport in Animals
Key concepts: Heart structure, cardiac cycle, blood vessels (arteries, veins, capillaries), blood components, double circulation, coronary heart disease
Command words focus: describe, explain, label, state, identify
Include: pressure changes in cardiac cycle, single vs double circulation`,

  "diseases-and-immunity": `
IGCSE Biology 0610 - Diseases and Immunity
Key concepts: Pathogens (bacteria, viruses, fungi, protists), transmission, barriers (skin, mucus, cilia, stomach acid), immune response (phagocytes, lymphocytes, antibodies, memory cells), vaccination, antibiotics
Command words focus: describe, explain, state, distinguish
Include: active vs passive immunity, natural vs artificial, herd immunity`,

  "respiration": `
IGCSE Biology 0610 - Respiration
Key concepts: Aerobic/anaerobic respiration equations, mitochondria, ATP, lactic acid, oxygen debt, yeast fermentation, gas exchange surfaces
Command words focus: write equations, describe, explain, compare
Include: aerobic vs anaerobic comparison table`,

  "excretion": `
IGCSE Biology 0610 - Excretion
Key concepts: Kidney structure, nephron, ultrafiltration, selective reabsorption, ADH, osmoregulation, dialysis, kidney transplant
Command words focus: describe, explain, outline, identify
Include: negative feedback with ADH`,

  "coordination-and-response": `
IGCSE Biology 0610 - Coordination and Response
Key concepts: Nervous system (neurons, synapse, reflex arc), endocrine system (hormones), eye (accommodation, pupil reflex), tropisms (phototropism, gravitropism), plant hormones (auxin)
Command words focus: describe, explain, outline, compare
Include: reflex arc sequence, hormone vs nerve comparison`,

  "drugs": `
IGCSE Biology 0610 - Drugs
Key concepts: Medicinal vs recreational, antibiotics, painkillers, alcohol, tobacco, heroin, effects on nervous system, addiction, withdrawal
Command words focus: describe, explain, state, evaluate`,

  "reproduction": `
IGCSE Biology 0610 - Reproduction
Key concepts: Asexual vs sexual, flower structure, pollination, fertilization, seed/ fruit dispersal, human reproductive systems, menstrual cycle, IVF, contraception
Command words focus: describe, explain, outline, compare, state
Include: wind vs insect pollination adaptations`,

  "inheritance": `
IGCSE Biology 0610 - Inheritance
Key concepts: Chromosomes, genes, alleles, dominant/recessive, genotype/phenotype, homozygous/heterozygous, monohybrid crosses, sex determination, codominance, sex-linkage, mutation
Command words focus: define, explain, predict, calculate, draw genetic diagrams
Include: Punnett squares, phenotypic/genotypic ratios`,

  "variation-and-selection": `
IGCSE Biology 0610 - Variation and Selection
Key concepts: Continuous/discontinuous variation, genetic/environmental causes, natural selection, antibiotic resistance, artificial selection, evolution evidence
Command words focus: describe, explain, outline, evaluate
Include: peppered moth, antibiotic resistance as example`,

  "organisms-and-environment": `
IGCSE Biology 0610 - Organisms and Environment
Key concepts: Ecosystem, habitat, population, community, food chains/webs, energy flow, pyramids (numbers, biomass, energy), carbon/nitrogen cycles, human impacts
Command words focus: describe, explain, interpret, construct
Include: pyramid drawing, energy transfer efficiency (10%)`,

  "biotechnology": `
IGCSE Biology 0610 - Biotechnology
Key concepts: Fermentation (yeast, yogurt), genetic engineering (insulin, GM crops), enzymes in industry, biofuels, bioremediation
Command words focus: describe, explain, outline, evaluate
Include: steps in genetic engineering (plasmid, restriction enzyme, ligase)`,
};

// ============================================
// CHEMISTRY (0620) TOPIC-SPECIFIC PROMPTS
// ============================================

export const CHEMISTRY_TOPIC_PROMPTS: Record<string, string> = {
  "states-of-matter": `
IGCSE Chemistry 0620 - States of Matter
Key concepts: Particle theory, kinetic theory, changes of state (melting, boiling, condensing, freezing, sublimation), diffusion, Brownian motion, gas pressure
Command words focus: describe, explain, state, predict
Include: particle diagrams, energy changes during state changes`,

  "atoms-elements-compounds": `
IGCSE Chemistry 0620 - Atoms, Elements and Compounds
Key concepts: Atom structure (protons, neutrons, electrons), atomic/proton number, mass/nucleon number, isotopes, electron configuration (2,8,8,18), periodic table groups/periods
Command words focus: state, define, identify, calculate, deduce
Include: relative atomic mass calculation from isotopes`,

  "stoichiometry": `
IGCSE Chemistry 0620 - Stoichiometry
Key concepts: Relative formula mass, mole concept, Avogadro's constant, molar volume (24 dm³ at RTP), concentration (mol/dm³), empirical/molecular formulae, % yield, % purity, limiting reagent
Command words focus: calculate, determine, deduce
Include: mole calculations, titration calculations`,

  "electrochemistry": `
IGCSE Chemistry 0620 - Electrochemistry
Key concepts: Electrolysis (molten, aqueous), electrodes (inert, reactive), products prediction, electroplating, aluminum extraction, fuel cells (hydrogen-oxygen)
Command words focus: predict, describe, explain, write half-equations
Include: half-equations at anode/cathode, reactivity series for product prediction`,

  "chemical-energetics": `
IGCSE Chemistry 0620 - Chemical Energetics
Key concepts: Exothermic/endothermic, bond breaking/making, reaction profiles, activation energy, catalysts, enthalpy change (ΔH), calorimetry, fuels (hydrogen, hydrocarbons), batteries
Command words focus: describe, explain, draw, calculate, interpret
Include: bond energy calculations, reaction profile diagrams`,

  "chemical-reactions": `
IGCSE Chemistry 0620 - Chemical Reactions
Key concepts: Rate of reaction, collision theory, factors (concentration, temperature, surface area, catalyst, pressure), enzymes, photochemical reactions, reversible reactions, equilibrium, Le Chatelier's principle
Command words focus: describe, explain, interpret graphs, predict, state
Include: graph interpretation (rate vs time, volume vs time)`,

  "acids-bases-salts": `
IGCSE Chemistry 0620 - Acids, Bases and Salts
Key concepts: pH scale, indicators, acid/base theories, neutralization, salt preparation methods (titration, excess base/carbonate, precipitation), strong/weak acids, oxides (acidic, basic, amphoteric, neutral)
Command words focus: describe, explain, predict, write equations, outline method
Include: ionic equations for neutralization`,

  "periodic-table": `
IGCSE Chemistry 0620 - The Periodic Table
Key concepts: Group 1 (alkali metals), Group 7 (halogens), Group 0 (noble gases), transition metals, trends (reactivity, melting/boiling points, displacement reactions)
Command words focus: describe, explain, predict, compare, state
Include: displacement reactions, trend explanations`,

  "metals": `
IGCSE Chemistry 0620 - Metals
Key concepts: Reactivity series, extraction methods (carbon reduction, electrolysis), uses of metals (Al, Cu, Fe, Zn), alloys, steel making, corrosion (rusting), sacrificial protection
Command words focus: describe, explain, predict, state, outline
Include: blast furnace reactions, rusting conditions`,

  "air-and-water": `
IGCSE Chemistry 0620 - Air and Water
Key concepts: Air composition, pollutants (CO, SO2, NOx, CFCs), greenhouse effect, carbon cycle, water treatment, hardness (temporary/permanent), desalination
Command words focus: describe, explain, state, identify, outline
Include: causes/effects of pollution, water treatment steps`,

  "sulfur": `
IGCSE Chemistry 0620 - Sulfur
Key concepts: Sources, Contact process (SO2 → SO3 → H2SO4), uses of sulfuric acid, acid rain
Command words focus: describe, explain, write equations, state conditions
Include: Contact process conditions (V2O5 catalyst, 450°C, 1-2 atm)`,

  "carbonates": `
IGCSE Chemistry 0620 - Carbonates
Key concepts: Thermal decomposition (CaCO3 → CaO + CO2), lime cycle (limestone → quicklime → slaked lime), uses of lime, test for CO2 (limewater)
Command words focus: describe, write equations, state observations, explain
Include: balanced equations for thermal decomposition`,

  "organic-chemistry": `
IGCSE Chemistry 0620 - Organic Chemistry
Key concepts: Hydrocarbons (alkanes, alkenes), homologous series, isomerism, fractional distillation, cracking, combustion, addition reactions (hydrogen, steam, halogens), polymers (addition, condensation), alcohols, carboxylic acids, esters
Command words focus: name, draw, describe, explain, write equations, identify
Include: structural formulae, naming (IUPAC), polymerization`,

  "experimental-techniques": `
IGCSE Chemistry 0620 - Experimental Techniques
Key concepts: Separation methods (filtration, crystallization, distillation, chromatography), purity testing (melting/boiling points), gas collection, titration, qualitative analysis (flame tests, cation/anion tests)
Command words focus: describe, outline, explain, identify, state
Include: Rf calculation, titration procedure, test observations`,

  "identification-of-ions": `
IGCSE Chemistry 0620 - Identification of Ions and Gases
Key concepts: Flame tests (Li, Na, K, Ca, Ba, Cu), cation tests (NaOH, NH3), anion tests (CO3²⁻, SO4²⁻, Cl⁻, NO3⁻, I⁻), gas tests (H2, O2, CO2, NH3, Cl2, SO2)
Command words focus: describe, state, identify, write observations
Include: table of test results with observations`,
};

// ============================================
// PROMPT BUILDER
// ============================================

export function buildIGCSEPrompt(context: IGCSEContext, options: {
  questionCount: number;
  types: string[];
  difficulty: "core" | "extended" | "mixed";
}): string {
  const topicKey = `${context.subject}-${context.topic.toLowerCase().replace(/\s+/g, "-")}`;
  const topicPrompt = context.subject === "biology"
    ? BIOLOGY_TOPIC_PROMPTS[topicKey] || ""
    : CHEMISTRY_TOPIC_PROMPTS[topicKey] || "";

  const difficultyText = options.difficulty === "core"
    ? "CORE tier (grades C-G) - focus on recall, basic understanding, simple calculations"
    : options.difficulty === "extended"
    ? "EXTENDED tier (grades A*-C) - focus on application, analysis, multi-step calculations, data interpretation"
    : "MIXED Core and Extended - include both straightforward and challenging questions";

  const typeDistribution = options.types.map(t => {
    switch (t) {
      case "MULTIPLE_CHOICE": return "Multiple Choice (4 options, 1 correct)";
      case "SHORT_ANSWER": return "Short Answer (1-3 sentences)";
      case "ESSAY": return "Essay/Structured (extended response)";
    }
  }).join(", ");

  return `You are an expert IGCSE ${context.subjectName} (${context.syllabusCode}) examiner creating exam-style questions.

SYLLABUS CONTEXT:
- Subject: ${context.subjectName} (${context.syllabusCode})
- Unit: ${context.unit}
- Topic: ${context.topic}
- ${topicPrompt}

QUESTION REQUIREMENTS:
- Total questions: ${options.questionCount}
- Question types: ${typeDistribution}
- Difficulty: ${difficultyText}
- Marks per question: MC (1-3), Short Answer (2-5), Essay (5-10)

IGCSE COMMAND WORDS TO USE:
${context.commandWords.join(", ")}

STYLE GUIDELINES:
1. Use precise scientific terminology
2. Include diagrams/data tables where appropriate (describe them in text)
3. For calculations: show formula, substitution, answer with units
4. For MC: plausible distractors based on common misconceptions
5. For SA/Essay: detailed mark schemes with marking points
6. Balance question types across Bloom's taxonomy (remember, understand, apply, analyze, evaluate)

Return ONLY the JSON structure specified.`;
}

export function getSubjectContext(subjectSlug: string, unitName: string, topicName: string): IGCSEContext {
  const base = IGCSE_SUBJECTS[subjectSlug] || IGCSE_SUBJECTS.biology;
  return {
    ...base,
    unit: unitName,
    topic: topicName,
  };
}