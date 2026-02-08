import { useState } from 'react';
import { useHomeStore } from '@/store/homeStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Home } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCreateRoom } from '@/hooks/useRoom';
import { validateRoomName, validateRoomRequest } from '@/lib/validation/room.validation';
import { getUserFriendlyError } from '@/utils/errorHandler';

export default function CreateRoomModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { currentHome } = useHomeStore();
  const createRoomMutation = useCreateRoom();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear errors
    setValidationError(null);
    setApiError(null);
    
    if (!currentHome) {
      setValidationError('Vui lòng chọn một nhà trước khi tạo phòng');
      return;
    }
    
    const trimmedName = name.trim();
    const nameError = validateRoomName(trimmedName);
    
    if (nameError) {
      setValidationError(nameError);
      return;
    }

    try {
      await createRoomMutation.mutateAsync({
        name: trimmedName,
        homeId: currentHome.id,
      });
      
      setOpen(false);
      setName('');
      setValidationError(null);
    } catch (err: any) {
      setApiError(getUserFriendlyError(err));
    }
  };

  const commonRoomNames = ['Phòng khách', 'Phòng ngủ', 'Bếp', 'Phòng tắm', 'Phòng làm việc'];

  const handleQuickSelect = (roomName: string) => {
    setName(roomName);
    const error = validateRoomName(roomName);
    setValidationError(error);
    setApiError(null);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    
    // Real-time validation
    const error = validateRoomName(value.trim());
    setValidationError(error);
    
    // Clear API error when user types
    if (apiError) {
      setApiError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm phòng
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Tạo phòng mới
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Hiển thị nhà hiện tại */}
            {currentHome && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium">Nhà hiện tại</p>
                  <p className="text-sm text-muted-foreground">{currentHome.name}</p>
                </div>
                <Badge variant="outline">{currentHome.id}</Badge>
              </div>
            )}
            
            {/* Input tên phòng */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Tên phòng <span className="text-red-500">*</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({name.trim().length}/50)
                </span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ví dụ: Phòng khách"
                autoFocus
                disabled={createRoomMutation.isPending}
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
            
            {/* Gợi ý nhanh */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Gợi ý nhanh:</p>
              <div className="flex flex-wrap gap-2">
                {commonRoomNames.map((roomName) => (
                  <Button
                    key={roomName}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect(roomName)}
                    className="text-xs"
                    disabled={createRoomMutation.isPending}
                  >
                    {roomName}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Hiển thị lỗi API */}
            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName('');
                setValidationError(null);
                setApiError(null);
              }}
              disabled={createRoomMutation.isPending}
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={createRoomMutation.isPending || 
                       !name.trim() || 
                       !!validationError ||
                       !currentHome}
              className="gap-2"
            >
              {createRoomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo phòng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}