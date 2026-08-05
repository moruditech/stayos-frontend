'use client';
import React from 'react';
import { ResetPasswordPage } from '@stayos/ui';
interface Props { params: { token: string } }
export default function Page({ params }: Props): React.ReactElement {
  return <ResetPasswordPage token={params.token} loginPath="/login" />;
}
