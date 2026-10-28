import AppRoutes from './app/routes';
import { DialogProvider } from './shared/ui';

export default function App() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b]">
      <DialogProvider>
        <AppRoutes />
      </DialogProvider>
    </div>
  );
}
