self.addEventListener("push", (event) => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title ?? "Calcetto Scarsi", {
            body: data.body ?? "",
            icon: "/icons/android/android-launchericon-192-192.png",
            badge: "/icons/android/android-launchericon-192-192.png",
            data: { url: data.url ?? "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? "/";
    event.waitUntil(self.clients.openWindow(url));
});