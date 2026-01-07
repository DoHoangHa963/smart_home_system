import React from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle forgot password logic here
  };

  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn để nhận liên kết đặt lại mật khẩu"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          leftIcon={
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        
        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
        >
          Gửi liên kết đặt lại
        </Button>
        
        <p className="text-center text-sm text-neutral-600">
          <Link 
            to="/login" 
            className="font-medium text-primary-500 hover:text-primary-600 hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;