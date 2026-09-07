<script>
  import AiPage from "./AiPage.svelte";
  import ChatPage from "./ChatPage.svelte";
  import Frame from "./Frame.svelte";
  import SettingsPage from "./SettingsPage.svelte";
  import StartPage from "./StartPage.svelte";
  import { tabs } from "../lib/tabs.svelte.js";
</script>

<main id="content">
  <div id="frames">
    {#each tabs.filter((tab) => tab.kind === "proxy") as tab (tab.id)}
      <Frame id={tab.id} />
    {/each}
  </div>

  <StartPage />
  <SettingsPage />
  <ChatPage />
  {#each tabs.filter((tab) => tab.kind === "ai") as tab (tab.id)}
    <AiPage id={tab.id} />
  {/each}
</main>
