import { useSimulation } from './hooks'

function App() {
  const { state, setState, step } = useSimulation()

  setInterval(() => {
    setState((prev) => step(prev, 100))
  }, 100)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-5 text-3xl font-bold text-gray-900">
        Absence Epilepsy Visual
      </h1>

      <h2>Mode: {state.mode}</h2>
      <div className="flex gap-2">
        <div>Cortex: {state.cortex}</div>
        <div>Thalamus: {state.thalamus}</div>
      </div>
    </div>
  )
}

export default App
