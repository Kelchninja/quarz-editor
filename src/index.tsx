/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { setupLibraries } from "./setup";

setupLibraries().then(() => render(() => <App />, document.getElementById("root") as HTMLElement));
