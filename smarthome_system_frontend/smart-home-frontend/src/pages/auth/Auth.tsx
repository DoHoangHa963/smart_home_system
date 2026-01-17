import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { toast } from 'sonner';

/* =========================
   SCHEMA
========================= */

// Schema login
const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tài khoản'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

// Schema register - UPDATED: Added email
const registerSchema = z.object({
  username: z.string().min(3, 'Username tối thiểu 3 ký tự'),
  email: z.string().email('Email không hợp lệ'), // [New Field]
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm | RegisterForm>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
    defaultValues: {
      username: '',
      email: '', // [New Default Value]
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';

      // [Clean Payload] Remove confirmPassword before sending to backend
      // Backend expects: { username, email, password }
      const { confirmPassword, ...payload } = values;

      const res = await api.post(url, payload);
      const data = res.data;

      // Note: Adjust this check based on your actual API wrapper response
      // If your API returns raw data directly, you might check res.status instead
      if (data.code !== 1000 && !data.result) { 
         // Assuming standard structure, modify if your wrapper is different
      }

      if (mode === 'login') {
        // Map backend response to store (adjust 'data.result' if your wrapper uses that)
        login(data.result || data.data); 
        toast.success('Đăng nhập thành công');
        navigate('/dashboard', { replace: true });
      } else {
        toast.success('Đăng ký thành công! Vui lòng đăng nhập');
        setMode('login');
        form.reset();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Có lỗi xảy ra'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Đăng nhập vào SmartHome'
              : 'Tạo tài khoản SmartHome'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {/* USERNAME */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EMAIL - [New Field] Only show in register mode */}
              {mode === 'register' && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* PASSWORD */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => {
                      navigate('/forgot-password');
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nhập lại mật khẩu</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? 'Đang xử lý...'
                  : mode === 'login'
                  ? 'Đăng nhập'
                  : 'Đăng ký'}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center">
          {mode === 'login' ? (
            <p className="text-sm">
              Chưa có tài khoản?{' '}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setMode('register');
                  form.reset();
                }}
              >
                Đăng ký
              </button>
            </p>
          ) : (
            <p className="text-sm">
              Đã có tài khoản?{' '}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setMode('login');
                  form.reset();
                }}
              >
                Đăng nhập
              </button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}