import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Gallery } from './pages/Gallery';
import { Find } from './pages/Find';
import { WorkDetail } from './pages/WorkDetail';
import { AddWork } from './pages/AddWork';
import { Me } from './pages/Me';
import { TagsPage } from './pages/TagsPage';
import { WorkProvider } from './stores/WorkStore';
import { consumeLoginCallback } from './lib/supabase';

export default function App() {
  // OAuth 回调固定落到 origin（/）：在这里消费票据并把结果经 sessionStorage 桥给 /me 展示
  useEffect(() => {
    consumeLoginCallback().then((r) => {
      if (r.status === 'none') return;
      try {
        sessionStorage.setItem(
          'auth-callback-msg',
          r.status === 'ok' ? 'OK' : `登录回调失败：${r.message}`,
        );
      } catch {
        /* sessionStorage 不可用时忽略 */
      }
    });
  }, []);
  return (
    <WorkProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/find" element={<Find />} />
          <Route path="/work/:id" element={<WorkDetail />} />
          <Route path="/add" element={<AddWork />} />
          <Route path="/edit/:id" element={<AddWork />} />
          <Route path="/me" element={<Me />} />
          <Route path="/tags" element={<TagsPage />} />
        </Routes>
      </AppShell>
    </WorkProvider>
  );
}
