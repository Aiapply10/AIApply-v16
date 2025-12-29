import { useEffect, useState } from 'react';
import { authAPI } from '../lib/api';
import { Progress } from './ui/progress';
import { CheckCircle2, AlertCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProfileCompleteness({ compact = false }) {
  const [completeness, setCompleteness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompleteness();
  }, []);

  const loadCompleteness = async () => {
    try {
      const response = await authAPI.getProfileCompleteness();
      setCompleteness(response.data);
    } catch (error) {
      console.error('Error loading profile completeness:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !completeness) {
    return null;
  }

  const { percentage, missing_fields } = completeness;
  
  const getColorClass = () => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const fieldLabels = {
    name: 'Full Name',
    email: 'Email',
    primary_technology: 'Primary Technology',
    sub_technologies: 'Sub Technologies',
    location: 'Current Location',
    phone: 'Phone Number',
    linkedin_profile: 'LinkedIn Profile',
    salary_min: 'Minimum Salary',
    salary_max: 'Maximum Salary',
    tax_type: 'Tax Type Preference',
    relocation_preference: 'Relocation Preference',
    location_preferences: 'Preferred Locations',
    job_type_preferences: 'Job Type Preferences',
    resume: 'Resume Upload',
  };

  if (compact) {
    return (
      <Link to="/profile" className="block">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full border-4 ${percentage >= 80 ? 'border-green-500' : percentage >= 50 ? 'border-yellow-500' : 'border-red-500'} flex items-center justify-center`}>
              <span className={`text-sm font-bold ${getColorClass()}`}>{percentage}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Profile Completion</p>
            <p className="text-xs text-muted-foreground truncate">
              {percentage >= 100 ? 'Complete!' : `${missing_fields.length} items remaining`}
            </p>
          </div>
          {percentage < 100 && <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />}
          {percentage >= 100 && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          Profile Completeness
        </h3>
        <span className={`text-2xl font-bold ${getColorClass()}`}>{percentage}%</span>
      </div>
      
      <div className="relative">
        <Progress value={percentage} className="h-3" />
        <div 
          className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {missing_fields.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Complete these to improve your profile:</p>
          <div className="flex flex-wrap gap-2">
            {missing_fields.slice(0, 5).map((field) => (
              <span 
                key={field}
                className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"
              >
                {fieldLabels[field] || field}
              </span>
            ))}
            {missing_fields.length > 5 && (
              <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                +{missing_fields.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
      
      {percentage >= 100 && (
        <div className="flex items-center gap-2 text-green-500 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Your profile is complete!
        </div>
      )}
    </div>
  );
}

export default ProfileCompleteness;
