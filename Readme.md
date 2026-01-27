# vite-hmr-tchmi

A utility library to enable Hot Module Replacement (HMR) for Beckhoff TwinCAT HMI (TcHmi) Framework Controls when using Vite.

---

## Disclaimer

**This is not an official Beckhoff product.** This project is a community-maintained tool. "TwinCAT" and "Beckhoff" are registered trademarks of Beckhoff Automation GmbH & Co. KG.

---

## Description

This package provides the necessary logic to hot-reload TcHmi Controls without refreshing the entire browser page. It works by:

* **Prototype Patching:** Dynamically updating the control's logic while preserving the internal state where possible.
* **Lifecycle Management:** Automatically triggering `__detach()` and `__attach()` to re-render the control in the DOM.
* **Seamless Integration:** Designed to work specifically with Vite's `import.meta.hot` API.

---

## Installation

```bash
npm install vite-hmr-tchmi --save-dev
```

---

## Usage

In your TcHmi Control script file, import the handler and call it within the Vite HMR lifecycle:
```ts
import { handleTcHmiHmr } from 'vite-hmr-tchmi';

// ... Your Control Class Definition ...
export class MyCustomControl extends TcHmi.Controls.System.TcHmiControl {
    // ...
}

// Enable HMR for this module
if (import.meta.hot) import.meta.hot.accept((newModule) => handleTcHmiHmr(newModule));
```

---

Hier ist der restliche Teil der README ab How it works im Markdown-Format zum Kopieren:

Markdown

## How it works

When a file change is detected, Vite provides the updated module. The `handleTcHmiHmr` function:
1. **Module Scanning:** Scans the new module for classes extending `TcHmiControl`.
2. **Instance Mapping:** Locates all active instances of these controls in the current `TcHmi.Controls.getMap()`.
3. **Detaching:** Calls `__detach()` on each instance to cleanly stop its current lifecycle.
4. **Prototype Patching:** Swaps the internal prototype of the existing instance with the new logic from the updated module.
5. **Re-Attaching:** Calls `__attach()` to re-render the control and restart its lifecycle with the new code.

---

## API Reference

### `handleTcHmiHmr(newModule: any): void`

The main entry point for patching controls.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `newModule` | `any` | The module object provided by `import.meta.hot.accept`. |