import React, { Suspense } from 'react';
import ReputationComponent from './reputation';

export default function ReputationPage() {
  return (
    <Suspense fallback={<div>Loading reputation...</div>}>
      <ReputationComponent />
    </Suspense>
  );
}
