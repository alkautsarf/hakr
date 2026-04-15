const args = process.argv.slice(2);

// CLI mode: any arguments = skip TUI
if (args.length > 0) {
  const { runCli } = await import("./cli.ts");
  await runCli(args);
} else {
  // TUI mode
  const { render } = await import("@opentui/solid");
  const { createCliRenderer } = await import("@opentui/core");
  const { createAppStore, AppStoreProvider } = await import("./ui/state.tsx");
  const { ThemeProvider } = await import("./ui/theme.tsx");
  const { App } = await import("./ui/app.tsx");

  const [store, setStore, helpers] = createAppStore();

  const renderer = await createCliRenderer({
    targetFps: 30,
    exitOnCtrlC: false,
  });

  function quit() {
    try {
      renderer.destroy();
    } catch {}
    process.stdout.write(
      "\x1b[?1049l\x1b[?25h\x1b[?1000l\x1b[?1002l\x1b[?1006l\x1b[0m\x1b[2J\x1b[H",
    );
    process.exit(0);
  }

  await render(
    () => (
      <AppStoreProvider store={store} setStore={setStore} helpers={helpers}>
        <ThemeProvider>
          <App onQuit={quit} />
        </ThemeProvider>
      </AppStoreProvider>
    ),
    renderer,
  );
}
