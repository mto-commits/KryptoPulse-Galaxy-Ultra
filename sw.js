const CACHE='kryptopulse-galaxy-v9-6-0-micro-push-20260901';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const isNav = event.request.mode==='navigate';
  if(isNav){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(r=>{
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copy));
          return r;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(r=>{
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
        return r;
      })
      .catch(()=>caches.match(event.request))
  );
});


self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='KP_NOTIFY'&&d.title){
    event.waitUntil(self.registration.showNotification(d.title,{
      body:d.body||'',tag:d.tag||'kp-alert',icon:'./icon-192.png',badge:'./icon-192.png',data:{url:d.url||'./'}
    }));
  }
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus'in c){c.navigate?.(target);return c.focus()}}
    return clients.openWindow?clients.openWindow(target):null;
  }));
});
