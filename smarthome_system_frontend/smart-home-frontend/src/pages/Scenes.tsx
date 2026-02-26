import { Clapperboard } from 'lucide-react';

export default function Scenes() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <Clapperboard className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Ngữ cảnh</h1>
        <p className="text-muted-foreground mt-2 text-lg">Đang phát triển</p>
      </div>
    </div>
  );
}
