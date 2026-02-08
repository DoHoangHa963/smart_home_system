import { useState, useEffect } from 'react';
import { useHomeStore } from '@/store/homeStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserFriendlyError } from '@/utils/errorHandler';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  homeId: number;
}

export default function AddMemberModal({ open, onClose, homeId }: AddMemberModalProps) {
  const { addMember, isLoading } = useHomeStore();
  const [formData, setFormData] = useState({
    identifier: '',
    role: 'MEMBER',
  });
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Reset state khi modal mở/đóng
  useEffect(() => {
    if (open) {
      setFormData({ identifier: '', role: 'MEMBER' });
      setValidationError('');
      setApiError('');
      setSuccess(false);
      setHasSubmitted(false);
    }
  }, [open]);

  const validateForm = () => {
    const identifier = formData.identifier.trim();
    
    if (!identifier) {
      setValidationError('Vui lòng nhập email hoặc username');
      return false;
    }
    
    // Kiểm tra định dạng email hoặc username
    if (identifier.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        setValidationError('Định dạng email không hợp lệ');
        return false;
      }
    } else {
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
      if (!usernameRegex.test(identifier)) {
        setValidationError('Username phải từ 3-50 ký tự, chỉ chứa chữ, số và dấu gạch dưới');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');
    setSuccess(false);
    setHasSubmitted(true);
    
    if (!validateForm()) {
      return;
    }

    try {
      await addMember(homeId, formData.identifier.trim(), formData.role);
      setSuccess(true);
      
      // Tự đóng modal sau 1.5 giây khi thành công
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error: any) {
      const errorMessage = getUserFriendlyError(error);
      
      // Handle specific cases for better UX
      if (error.response?.status === 409) {
        setApiError('Người dùng này đã là thành viên của nhà');
      } else if (error.response?.status === 404) {
        setApiError('Không tìm thấy người dùng với thông tin này');
      } else {
        setApiError(errorMessage);
      }
    }
  };

  const handleClose = () => {
    // Reset tất cả state
    setFormData({ identifier: '', role: 'MEMBER' });
    setValidationError('');
    setApiError('');
    setSuccess(false);
    setHasSubmitted(false);
    onClose();
  };

  // Xử lý khi người dùng thay đổi input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, identifier: value });
    
    // Clear validation error khi người dùng bắt đầu nhập lại
    if (validationError || apiError) {
      setValidationError('');
      setApiError('');
    }
    
    // Nếu đã submit và có lỗi, clear lỗi khi user sửa
    if (hasSubmitted && (validationError || apiError)) {
      setValidationError('');
      setApiError('');
    }
  };

  // Hiển thị placeholder lỗi nếu đã submit và có lỗi
  const getPlaceholder = () => {
    if (apiError) {
      if (apiError.includes('Không tìm thấy')) {
        return 'Vui lòng nhập đúng email/username';
      } else if (apiError.includes('đã là thành viên')) {
        return 'Người dùng này đã có trong nhà';
      }
    }
    return 'user@example.com hoặc username';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]" onInteractOutside={(e) => {
        // Ngăn không cho click outside đóng modal khi đang loading
        if (isLoading) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Mời thành viên mới</DialogTitle>
          <DialogDescription className="text-center">
            Thêm người dùng vào nhà bằng email hoặc username
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Thông báo thành công */}
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Đã mời thành công!</p>
                    <p className="text-sm">Đang đóng modal...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Identifier Input */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="flex items-center gap-1">
                <span>Email hoặc Username</span>
                <span className="text-red-500">*</span>
              </Label>
              
              <div className="relative">
                <Input
                  id="identifier"
                  placeholder={getPlaceholder()}
                  value={formData.identifier}
                  onChange={handleInputChange}
                  className={cn(
                    "pr-10 transition-colors",
                    validationError || apiError ? 
                      "border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-900/10" : 
                      "",
                    success ? "border-green-500 focus-visible:ring-green-500" : ""
                  )}
                  disabled={isLoading || success}
                  autoFocus={!success}
                />
                
                {/* Status Icon */}
                {(validationError || apiError) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
                {success && !validationError && !apiError && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>

              {/* Hiển thị validation error */}
              {validationError && (
                <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400 text-sm animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Hiển thị API error */}
              {apiError && (
                <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400 text-sm animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{apiError}</span>
                    {apiError.includes('Không tìm thấy') && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>Hãy đảm bảo:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>Email/username chính xác</li>
                          <li>Người dùng đã đăng ký tài khoản</li>
                          <li>Viết liền không dấu, không khoảng trắng</li>
                        </ul>
                      </div>
                    )}
                    {apiError.includes('đã là thành viên') && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>Người dùng này đã có quyền truy cập vào nhà.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Nhập email đã đăng ký hoặc username của người dùng
              </p>
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={isLoading || success}
              >
                <SelectTrigger className={apiError ? 'border-red-200' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="GUEST">Guest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vai trò quyết định quyền hạn của thành viên trong nhà
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className={apiError ? 'border-red-200 text-red-700 hover:bg-red-50' : ''}
            >
              {apiError ? 'Thử lại' : 'Hủy'}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || success || !formData.identifier.trim()}
              className={cn(
                "transition-all",
                apiError ? "bg-red-600 hover:bg-red-700" : ""
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang kiểm tra...
                </span>
              ) : success ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Thành công
                </span>
              ) : apiError ? (
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Thử lại
                </span>
              ) : (
                'Mời thành viên'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}