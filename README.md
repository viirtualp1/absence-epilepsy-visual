# Absence Lab

## Project

Absence Lab is an interactive teaching example of a typical absence seizure in childhood absence epilepsy. The 3D explorer links a brain atlas to a synthetic scalp EEG so you can see how the trace changes before, during, and after the event.

Circuit view emphasizes the thalamus and its connections through a faint cortical surface. Anatomy view shows the solid outer structures. Drag to orbit, scroll or pinch to zoom, and select a part on the model or in the inspector. On a phone, the Part, EEG, and Phase tabs are below the model.

The recording lasts 14 seconds. Drag or click the EEG to scrub, or use the Before, During, and After shortcuts. Hover, focus, or select an EEG lead to see its approximate electrode pair. With the explorer focused, Space plays or pauses, the arrow keys step by half a second, and 1–3 jump to phases.

Use Node.js 24 LTS and npm. The app opens at `/`.

```sh
npm ci
npm run dev
npm run lint
npm run build
```

## Medical context

**Typical absence seizure.** A brief generalized seizure with a sudden change in awareness. A child may stop what they are doing and stare, then resume the activity as the seizure ends. Childhood absence epilepsy (CAE) is an epilepsy syndrome in which typical absence seizures are the main seizure type. [ILAE clinical overview](https://www.epilepsydiagnosis.org/seizure/absence-typical-overview.html) · [ILAE classification of generalized epilepsy syndromes](https://doi.org/10.1111/epi.17236)

**Scalp EEG and spike-and-wave.** A bipolar EEG lead compares voltages at two scalp electrodes. During a typical absence seizure in CAE, generalized spike-and-wave discharges occur around 3 Hz, with a range of 2.5–4 Hz. The synthetic example shows the pattern in four leads, with larger deflections in the frontal leads. The electrode markers indicate approximate 10–20 positions. [ILAE EEG description](https://www.epilepsydiagnosis.org/syndrome/cae-eeg.html) · [ACNS electrode nomenclature](https://www.acns.org/UserFiles/file/EEGGuideline2Electrodenomenclature_final_v1.pdf)

**Thalamocortical network.** The cortex and thalamus are connected by reciprocal pathways. The curves and moving markers are illustrative and the motion is slowed for display. The anatomy comes from the Human Reference Atlas under CC BY 4.0. [Childhood absence epilepsy network study](https://pubmed.ncbi.nlm.nih.gov/36370186/) · [Model attribution](public/atlas/ATTRIBUTION.txt)
