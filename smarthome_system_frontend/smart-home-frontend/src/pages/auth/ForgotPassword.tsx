import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import api, { isNetworkError } from '@/lib/api';
import type { ApiResponse } from '@/types/auth';
import { getUserFriendlyError } from '@/utils/errorHandler';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const step1Schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
});

const step2Schema = z.object({
  code: z
    .string()
    .length(6, 'Mã xác thực phải đúng 6 số')
    .regex(/^\d{6}$/, 'Mã xác thực chỉ gồm 6 chữ số'),
});

const step3Schema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'Mật khẩu tối thiểu 6 ký tự')
      .regex(
        /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$/,
        'Mật khẩu cần có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'
      ),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const form1 = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: '' },
  });

  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { code: '' },
  });

  const form3 = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onStep1(values: Step1Form) {
    setLoading(true);
    try {
      await api.post<ApiResponse<unknown>>('/auth/forgot-password', { email: values.email });
      setEmail(values.email);
      setStep(2);
      toast.success('Mã xác thực đã được gửi đến email của bạn');
    } catch (error: unknown) {
      const isNetwork = isNetworkError(error);
      if (isNetwork) {
        setEmail(values.email);
        setStep(2);
        toast.warning('Không thể kết nối server. Nếu bạn đã nhận được mã qua email, hãy nhập bên dưới.');
      } else {
        toast.error(getUserFriendlyError(error));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onStep2(values: Step2Form) {
    setLoading(true);
    try {
      await api.post<ApiResponse<unknown>>('/auth/verify-otp', {
        email,
        code: values.code,
      });
      setCode(values.code);
      setStep(3);
      toast.success('Mã xác thực hợp lệ');
    } catch (error: unknown) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  async function onStep3(values: Step3Form) {
    setLoading(true);
    try {
      await api.post<ApiResponse<unknown>>('/auth/reset-password', {
        email,
        code,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      navigate('/auth', { replace: true });
    } catch (error: unknown) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Quên mật khẩu'}
            {step === 2 && 'Nhập mã xác thực'}
            {step === 3 && 'Mật khẩu mới'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Nhập email đăng ký để nhận mã xác thực 6 số'}
            {step === 2 && 'Nhập mã 6 số đã gửi đến email của bạn'}
            {step === 3 && 'Nhập mật khẩu mới cho tài khoản'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <Form {...form1}>
              <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
                <FormField
                  control={form1.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
                </Button>
              </form>
            </Form>
          )}

          {step === 2 && (
            <Form {...form2}>
              <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
                <FormField
                  control={form2.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã xác thực (6 số)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000000"
                          maxLength={6}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          {...field}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                            field.onChange(v);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Xác thực'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={() => setStep(1)}
                >
                  Quay lại đổi email
                </Button>
              </form>
            </Form>
          )}

          {step === 3 && (
            <Form {...form3}>
              <form onSubmit={form3.handleSubmit(onStep3)} className="space-y-4">
                <FormField
                  control={form3.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu mới</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Ít nhất 6 ký tự, 1 hoa, 1 thường, 1 số" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form3.control}
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={() => setStep(2)}
                >
                  Quay lại nhập mã
                </Button>
              </form>
            </Form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm">
            Đã nhớ mật khẩu?{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => navigate('/auth')}
            >
              Đăng nhập
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
