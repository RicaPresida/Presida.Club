import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Crown } from 'lucide-react';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';
import { usePlanFeatures } from '../hooks/usePlanFeatures';

const SubscriptionBanner: React.FC = () => {
  // This component is now empty as we're removing the top notification bar
  // The subscription status is now only shown in the sidebar
  return null;
};

export default SubscriptionBanner;