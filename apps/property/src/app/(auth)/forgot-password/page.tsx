'use client';
import React from 'react';
import { ForgotPasswordPage } from '@stayos/ui';
export default function Page(): React.ReactElement {
  return <ForgotPasswordPage userType="property" loginPath="/login" />;
}
