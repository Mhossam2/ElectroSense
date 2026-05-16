import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const AppLayout = () => {
  // h-screen + flex column → main is exactly the viewport minus the bottom nav,
  // and only main scrolls when content overflows. This kills the persistent
  // page scrollbar caused by `min-h-screen` siblings inside `<main pb-16>`.
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
