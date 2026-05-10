import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../common/Header';
import Footer from '../common/Footer';

// ChatBot is a floating widget — lazy load it so react-markdown (336KB) is deferred
const ChatBot = lazy(() => import('../chat/ChatBot'));

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <ChatBot chatType="public" />
      </Suspense>
    </div>
  );
};

export default MainLayout;

