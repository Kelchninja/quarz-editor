import { createSignal, onMount } from "solid-js";
import * as api from "../api";
import { mockNotes } from "../mockNotes";
import Editor from "./Editor";
import "../App.css";
import Sidebar from "./Sidebar";


function App() {
  // signals
  const [content, setContent] = createSignal("");
  const [activePath, setActivePath] = createSignal<string>();

  // functions
  async function openNote(path: string) {
    setActivePath(path);
    try {
      setContent(await api.openNote(path));
    } catch (error) {
      // Die Mock-Notizen gibt es meist nicht auf der Platte.
      console.error(`Konnte ${path} nicht öffnen:`, error);
    }
  }

  // onMount / onCleanup
  onMount(() => {
    openNote("goober.md");
  });

  // JSX
  return (
    <main class="app">
      <Sidebar
        title="Studium"
        entries={mockNotes}
        activePath={activePath()}
        onOpen={openNote}
      />
      <Editor doc={content()} />
    </main>
  );
}

export default App;
