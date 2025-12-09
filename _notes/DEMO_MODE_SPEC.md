# **Demo Mode Specification**

## **1. Goals**

* Provide a dedicated demo experience at `/demo` (or another demo URL).
* Load a prebuilt backup into a separate demo database.
* Prevent demo data from mixing with real user data.
* Allow users to exit demo mode simply by navigating to `/`.
* Provide a subtle but clear UI indicator that the app is running in demo mode.

---

# **2. Detection Logic**

### **Trigger**

Demo mode activates when:

```
location.pathname.startsWith('/demo')
```

### **Implementation**

At app startup:

```ts
export const isDemoMode = location.pathname.startsWith('/demo');
```

---

# **3. Database Selection**

Use two completely separate IndexedDB instances.

| Mode        | DB Name      |
| ----------- | ------------ |
| Demo Mode   | `ptpwa-demo` |
| Normal Mode | `ptpwa`      |

### **Implementation**

```ts
export function createDatabase(isDemo) {
  const name = isDemo ? 'ptpwa-demo' : 'ptpwa';
  const db = new Dexie(name);

  db.version(1).stores({
    exercises: '++id, name',
    sessions: '++id, title',
    // …
  });

  return db;
}
```

---

# **4. Demo Data Restore Logic**

### **Where**

Run immediately after DB creation if in demo mode.

### **Trigger**

Only import once per browser using a flag:

```
localStorage.setItem('ptpwa-demoLoaded', '1')
```

### **Implementation**

```ts
export async function initDemo(db) {
  const loaded = localStorage.getItem('ptpwa-demoLoaded');
  if (loaded) return;

  const resp = await fetch('/demo-backup.json');
  const dump = await resp.json();

  await db.import(dump);

  localStorage.setItem('ptpwa-demoLoaded', '1');
}
```

---

# **5. Routing Behavior**

### **Demo Route (`/demo`)**

* Uses demo DB.
* Auto-restores demo data.
* UI shows small “Demo Mode” indicator.
* Optionally includes a “Reset Demo” button (clears `ptpwa-demo` and reloads backup).

### **Normal Route (`/`)**

* Uses real DB.
* No demo data imported.
* No indicator.

### **Navigation**

Switching modes is as simple as navigating to or away from `/demo`.

---

# **6. Reset Demo (Optional)**

Provide an option in a menu or settings screen.

### **Implementation**

```ts
await db.delete();
localStorage.removeItem('ptpwa-demoLoaded');
location.reload();
```

---

# **7. Service Worker Considerations**

No service-worker changes required *unless*:

* You cache the JSON backup; or
* You want offline demo mode on first load.

Most apps simply let it fetch normally.

---

# **Subtle Demo Indicators (Common Patterns)**

PWAs that support demo, preview, or sandbox modes tend to use one or more of these:

### **1. Banner at the Top (most common)**

A slim (24–32px) bar with muted colors:

```
Demo Mode — Data will not be saved permanently.
```

Often gray or pale amber.

### **2. Watermark-Style Text in a Corner**

Small text in the top-right:

```
DEMO
```

Low opacity so it doesn’t distract.

### **3. Accent Color Shift**

UI switches to a slightly different top-bar color (e.g., gray instead of brand color). This is subtle but still communicates “different mode.”

### **4. Button Label Variation**

In menus:

```
Settings (Demo)
```

### **5. “Exit Demo” Link**

A link or button that simply routes to `/`.

### **Best Practice**

Use **two indicators**:

* one visible but unobtrusive (banner or corner label),
* and one clear escape route (“Exit Demo”).

---

# **Recommended Indicator for Your PT PWA**

Given your app’s clean, mobile-friendly layout:

* **Add a slim banner at the top:**

  * muted gray (`#eee`)
  * text: *Demo Mode: Data is example-only*
  * with an “Exit Demo” link → `/`

* **Also change the app header color** (optional):

  * normal header = your brand color
  * demo header = desaturated version

This gives clarity without distracting from the experience.
