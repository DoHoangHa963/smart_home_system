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
import { validateRoomName } from '@/lib/validation/room.validation';

interface EditRoomModalProps {
  room: RoomResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRoomModal({ room, open, onOpenChange }: EditRoomModalProps) {
  const [name, setName] = useState(room.name);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const updateRoomMutation = useUpdateRoom();

  useEffect(() => {
    if (open) {
      setName(room.name);
      setValidationError(null);
      setApiError(null);
    }
  }, [open, room.name]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationError(null);
    setApiError(null);
    
    // Validate input
    const trimmedName = name.trim();
    const nameError = validateRoomName(trimmedName);
    
    if (nameError) {
      setValidationError(nameError);
      return;
    }

    if (trimmedName === room.name) {
      onOpenChange(false);
      return;
    }

    try {
      await updateRoomMutation.mutateAsync({
        roomId: room.id,
        data: { 
          name: trimmedName, 
          homeId: room.homeId 
        }
      });
      
      onOpenChange(false);
    } catch (err: any) {
      // Xử lý lỗi từ API
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Không thể cập nhật phòng. Vui lòng thử lại.';
      setApiError(errorMessage);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    
    // Real-time validation
    if (value.trim() !== room.name) {
      const error = validateRoomName(value);
      setValidationError(error);
    } else {
      setValidationError(null);
    }
    
    // Clear API error when user types
    if (apiError) {
      setApiError(null);
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
              <Label htmlFor="edit-name">
                Tên phòng <span className="text-red-500">*</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({name.trim().length}/50)
                </span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={updateRoomMutation.isPending}
                autoFocus
                className={validationError ? 'border-red-500' : ''}
                maxLength={50}
              />
              
              {validationError ? (
                <p className="text-sm text-red-500">{validationError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tên phòng từ 2-50 ký tự, chỉ chứa chữ cái, số, dấu cách và các ký tự: .,-
                </p>
              )}
            </div>

            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
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
              disabled={updateRoomMutation.isPending || 
                       !name.trim() || 
                       !!validationError ||
                       name.trim() === room.name}
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