import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Gallery } from './pages/Gallery';
import { Find } from './pages/Find';
import { WorkDetail } from './pages/WorkDetail';
import { AddWork } from './pages/AddWork';
import { Me } from './pages/Me';
import { TagsPage } from './pages/TagsPage';
import { WorkProvider } from './stores/WorkStore';

export default function App() {
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
