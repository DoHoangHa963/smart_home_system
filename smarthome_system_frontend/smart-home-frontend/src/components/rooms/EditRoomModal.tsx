import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useUpdateRoom } from '@/hooks/useRoom';
import { RoomResponse } from '@/types/room';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditRoomModalProps {
  room: RoomResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRoomModal({ room, open, onOpenChange }: EditRoomModalProps) {
  const [name, setName] = useState(room.name);
  const [error, setError] = useState<string | null>(null);
  
  // Hook update từ useRoom.ts
  const updateRoomMutation = useUpdateRoom();

  // Reset tên về giá trị ban đầu mỗi khi mở modal
  useEffect(() => {
    if (open) {
      setName(room.name);
      setError(null);
    }
  }, [open, room.name]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!name.trim()) {
      setError('Tên phòng không được để trống');
      return;
    }

    if (name.trim() === room.name) {
      onOpenChange(false); // Không có thay đổi gì thì đóng luôn
      return;
    }

    try {
      // Gọi API update
      // Lưu ý: data phải bao gồm cả homeId vì interface RoomRequest yêu cầu
      await updateRoomMutation.mutateAsync({
        roomId: room.id,
        data: { 
          name: name.trim(), 
          homeId: room.homeId 
        }
      });
      
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật phòng. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleUpdate}>
          <DialogHeader>
            <DialogTitle>Đổi tên phòng</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tên phòng</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={updateRoomMutation.isPending}
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateRoomMutation.isPending}
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={updateRoomMutation.isPending || !name.trim()}
            >
              {updateRoomMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}