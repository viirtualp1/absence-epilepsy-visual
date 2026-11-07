import { ArrowUpRight, BookOpen, Menu } from 'lucide-react'

export function Sources() {
  return (
    <>
      <button type="button" className="sources-trigger" aria-label="Sources" popoverTarget="sources">
        <BookOpen className="sources-book" size={16} aria-hidden="true" />
        <Menu className="sources-menu" size={21} aria-hidden="true" />
        <span>Sources</span>
      </button>
      <section className="sources" id="sources" popover="auto" aria-labelledby="sources-title">
        <h2 id="sources-title">Sources</h2>
        <ul>
          <li><a href="https://www.epilepsydiagnosis.org/syndrome/cae-eeg.html">ILAE · Childhood absence epilepsy EEG <ArrowUpRight size={14} aria-hidden="true" /></a></li>
          <li><a href="https://www.epilepsydiagnosis.org/seizure/absence-typical-overview.html">ILAE · Typical absence seizure <ArrowUpRight size={14} aria-hidden="true" /></a></li>
          <li><a href="https://pubmed.ncbi.nlm.nih.gov/36370186/">Network study · Childhood absence epilepsy <ArrowUpRight size={14} aria-hidden="true" /></a></li>
        </ul>
        <p>The EEG is synthetic. Pathways are illustrative and electrode positions are approximate.</p>
        <p>Anatomy adapted from the <a href="https://3d.nih.gov/entries/3DPX-020959">Human Reference Atlas brain model</a> under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>
      </section>
    </>
  )
}
