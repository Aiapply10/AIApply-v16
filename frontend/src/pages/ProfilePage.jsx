import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProfileCompleteness } from '../components/ProfileCompleteness';
import { useAuthStore } from '../store';
import { authAPI, resumeAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Code, 
  Loader2, 
  Camera,
  Linkedin,
  DollarSign,
  Briefcase,
  FileText,
  Upload,
  X,
  Check,
  Globe,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

// US Cities for autocomplete
const US_CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Boston, MA',
  'Nashville, TN', 'Detroit, MI', 'Portland, OR', 'Memphis, TN', 'Oklahoma City, OK',
  'Las Vegas, NV', 'Louisville, KY', 'Baltimore, MD', 'Milwaukee, WI', 'Albuquerque, NM',
  'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA', 'Atlanta, GA', 'Miami, FL',
  'Raleigh, NC', 'Omaha, NE', 'Minneapolis, MN', 'Cleveland, OH', 'Tampa, FL',
  'Remote', 'Anywhere in US'
];

const PRIMARY_TECHNOLOGIES = ['Java', 'Python', 'PHP', 'AI', 'Front End React'];

// Sub-technologies mapped to primary technologies
const SUB_TECHNOLOGIES_MAP = {
  'Java': ['Spring Boot', 'Spring MVC', 'Hibernate', 'Maven', 'Gradle', 'JUnit', 'Microservices', 'REST APIs', 'JDBC', 'JSP', 'Servlets', 'Apache Kafka', 'JPA', 'Log4j', 'Tomcat'],
  'Python': ['Django', 'Flask', 'FastAPI', 'NumPy', 'Pandas', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Celery', 'SQLAlchemy', 'Pytest', 'BeautifulSoup', 'Selenium', 'OpenCV', 'Matplotlib'],
  'PHP': ['Laravel', 'Symfony', 'CodeIgniter', 'WordPress', 'Drupal', 'Magento', 'Composer', 'PHPUnit', 'MySQL', 'REST APIs', 'Blade', 'Twig', 'Redis', 'Eloquent ORM', 'CakePHP'],
  'AI': ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'OpenAI', 'LLMs', 'RAG', 'Langchain', 'Hugging Face', 'Neural Networks', 'Data Science'],
  'Front End React': ['JavaScript', 'TypeScript', 'Redux', 'Next.js', 'React Router', 'Tailwind CSS', 'Material UI', 'Styled Components', 'Jest', 'React Query', 'Axios', 'GraphQL', 'Webpack', 'Vite', 'Storybook'],
};

const TAX_TYPES = ['Fulltime', 'C2C', 'W2 Contract'];
const JOB_TYPES = ['Remote', 'Hybrid', 'Onsite'];
const RELOCATION_OPTIONS = ['Yes', 'No', 'Open to Discussion'];

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const profilePicInputRef = useRef(null);
  
  const [locationInput, setLocationInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  const [prefLocationInput, setPrefLocationInput] = useState('');
  const [prefLocationSuggestions, setPrefLocationSuggestions] = useState([]);
  const [showPrefLocationSuggestions, setShowPrefLocationSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    primary_technology: '',
    sub_technologies: [],
    linkedin_profile: '',
    salary_min: '',
    salary_max: '',
    salary_type: 'annual',
    tax_types: [],  // Changed to array for multiple selection
    relocation_preference: '',
    location_preferences: [],
    job_type_preferences: [],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        primary_technology: user.primary_technology || '',
        sub_technologies: user.sub_technologies || [],
        linkedin_profile: user.linkedin_profile || '',
        salary_min: user.salary_min || '',
        salary_max: user.salary_max || '',
        salary_type: user.salary_type || 'annual',
        tax_types: user.tax_types || (user.tax_type ? [user.tax_type] : []),  // Support old single value
        relocation_preference: user.relocation_preference || '',
        location_preferences: user.location_preferences || [],
        job_type_preferences: user.job_type_preferences || [],
      });
      setLocationInput(user.location || '');
    }
    loadResumes();
  }, [user]);

  const loadResumes = async () => {
    try {
      const response = await resumeAPI.getAll();
      setResumes(response.data || []);
    } catch (error) {
      console.error('Error loading resumes:', error);
    }
  };

  const handleLocationChange = (value) => {
    setLocationInput(value);
    if (value.length > 0) {
      const filtered = US_CITIES.filter(city => 
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(true);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const selectLocation = (city) => {
    setLocationInput(city);
    setFormData({ ...formData, location: city });
    setShowLocationSuggestions(false);
  };

  const handlePrefLocationChange = (value) => {
    setPrefLocationInput(value);
    if (value.length > 0) {
      const filtered = US_CITIES.filter(city => 
        city.toLowerCase().includes(value.toLowerCase()) &&
        !formData.location_preferences.includes(city)
      ).slice(0, 8);
      setPrefLocationSuggestions(filtered);
      setShowPrefLocationSuggestions(true);
    } else {
      setShowPrefLocationSuggestions(false);
    }
  };

  const addPrefLocation = (city) => {
    if (!formData.location_preferences.includes(city)) {
      setFormData({ 
        ...formData, 
        location_preferences: [...formData.location_preferences, city] 
      });
    }
    setPrefLocationInput('');
    setShowPrefLocationSuggestions(false);
  };

  const removePrefLocation = (city) => {
    setFormData({
      ...formData,
      location_preferences: formData.location_preferences.filter(c => c !== city)
    });
  };

  const toggleSubTech = (tech) => {
    if (formData.sub_technologies.includes(tech)) {
      setFormData({
        ...formData,
        sub_technologies: formData.sub_technologies.filter(t => t !== tech)
      });
    } else {
      setFormData({
        ...formData,
        sub_technologies: [...formData.sub_technologies, tech]
      });
    }
  };

  const toggleJobType = (type) => {
    if (formData.job_type_preferences.includes(type)) {
      setFormData({
        ...formData,
        job_type_preferences: formData.job_type_preferences.filter(t => t !== type)
      });
    } else {
      setFormData({
        ...formData,
        job_type_preferences: [...formData.job_type_preferences, type]
      });
    }
  };

  const toggleTaxType = (type) => {
    if (formData.tax_types.includes(type)) {
      setFormData({
        ...formData,
        tax_types: formData.tax_types.filter(t => t !== type)
      });
    } else {
      setFormData({
        ...formData,
        tax_types: [...formData.tax_types, type]
      });
    }
  };

  // Format number as USD
  const formatUSD = (value) => {
    if (!value) return '';
    const num = parseInt(value.toString().replace(/[^0-9]/g, ''));
    return isNaN(num) ? '' : num.toLocaleString('en-US');
  };

  const handleSalaryChange = (field, value) => {
    // Remove non-numeric characters for storage
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [field]: numericValue });
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    try {
      await resumeAPI.upload(file);
      toast.success('Resume uploaded successfully!');
      loadResumes();
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    try {
      await resumeAPI.remove(resumeId);
      toast.success('Resume deleted');
      loadResumes();
    } catch (error) {
      toast.error('Failed to delete resume');
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const response = await authAPI.uploadProfilePhoto(file);
      if (response.data.user) {
        updateUser(response.data.user);
      }
      toast.success('Profile photo updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (profilePicInputRef.current) {
        profilePicInputRef.current.value = '';
      }
    }
  };

  const handleRemoveProfilePhoto = async () => {
    try {
      await authAPI.deleteProfilePhoto();
      // Update local user state
      const updatedUser = { ...user, profile_picture: null, picture: null };
      setUser(updatedUser);
      toast.success('Profile photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        ...formData,
        location: locationInput,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
      };
      
      const response = await authAPI.updateProfile(updateData);
      
      // Update local user state
      if (response.data.user) {
        updateUser(response.data.user);
      }
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl" data-testid="profile-page">
        <div>
          <h1 className="font-heading text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and job preferences</p>
        </div>

        {/* Profile Completeness */}
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="pt-6">
            <ProfileCompleteness />
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar with upload option */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 ring-4 ring-violet-500/30">
                  <AvatarImage src={user?.picture || user?.profile_picture} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                {/* Upload overlay */}
                <input
                  type="file"
                  ref={profilePicInputRef}
                  onChange={handleProfilePhotoUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />
                <button
                  onClick={() => profilePicInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{user?.name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                {user?.linkedin_profile && (
                  <a href={user.linkedin_profile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                    <Linkedin className="w-3 h-3" /> LinkedIn Profile
                  </a>
                )}
                <div className="flex gap-2 pt-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => profilePicInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-1" />
                    )}
                    {user?.profile_picture || user?.picture ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {(user?.profile_picture || user?.picture) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemoveProfilePhoto}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2 relative">
                <Label>Current Location</Label>
                <Input
                  value={locationInput}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => locationInput && setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  placeholder="Start typing a city..."
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {locationSuggestions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm"
                        onMouseDown={() => selectLocation(city)}
                      >
                        <MapPin className="w-3 h-3 inline mr-2 text-muted-foreground" />
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>LinkedIn Profile</Label>
                <Input
                  value={formData.linkedin_profile}
                  onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills & Technologies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Skills & Technologies
            </CardTitle>
            <CardDescription>Your primary expertise and additional skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Primary Technology *</Label>
              <Select
                value={formData.primary_technology}
                onValueChange={(value) => setFormData({ ...formData, primary_technology: value, sub_technologies: [] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your main expertise" />
                </SelectTrigger>
                <SelectContent>
                  {PRIMARY_TECHNOLOGIES.map((tech) => (
                    <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sub Technologies - Auto-suggested based on primary technology */}
            {formData.primary_technology && SUB_TECHNOLOGIES_MAP[formData.primary_technology] && (
              <div className="space-y-3">
                <Label>Sub Technologies</Label>
                <p className="text-sm text-muted-foreground">
                  Select the sub-technologies you're proficient in for {formData.primary_technology}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {SUB_TECHNOLOGIES_MAP[formData.primary_technology].map((tech) => (
                    <Badge
                      key={tech}
                      variant={formData.sub_technologies.includes(tech) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors justify-center py-2 text-xs ${
                        formData.sub_technologies.includes(tech) 
                          ? 'bg-violet-600 hover:bg-violet-700' 
                          : 'hover:bg-violet-500/10'
                      }`}
                      onClick={() => toggleSubTech(tech)}
                    >
                      {formData.sub_technologies.includes(tech) && <Check className="w-3 h-3 mr-1" />}
                      {tech}
                    </Badge>
                  ))}
                </div>
                {formData.sub_technologies.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {formData.sub_technologies.length} technologies
                  </p>
                )}
              </div>
            )}
            
            {!formData.primary_technology && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Select a Primary Technology above to see related sub-technologies
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resume Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resume
            </CardTitle>
            <CardDescription>Upload and manage your resumes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleResumeUpload}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingResume}
            >
              {isUploadingResume ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Resume
            </Button>
            
            {resumes.length > 0 && (
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <div key={resume.resume_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-violet-500" />
                      <div>
                        <p className="font-medium text-sm">{resume.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteResume(resume.resume_id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Job Preferences
            </CardTitle>
            <CardDescription>Your preferred job conditions and compensation (USD)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Salary */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Salary Expectations (USD)
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    type="text"
                    value={formatUSD(formData.salary_min)}
                    onChange={(e) => handleSalaryChange('salary_min', e.target.value)}
                    placeholder="Min (e.g., 80,000)"
                    className="pl-7"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    type="text"
                    value={formatUSD(formData.salary_max)}
                    onChange={(e) => handleSalaryChange('salary_max', e.target.value)}
                    placeholder="Max (e.g., 120,000)"
                    className="pl-7"
                  />
                </div>
                <Select
                  value={formData.salary_type}
                  onValueChange={(value) => setFormData({ ...formData, salary_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Per Year (Annual)</SelectItem>
                    <SelectItem value="hourly">Per Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.salary_type === 'annual' 
                  ? 'Enter your expected annual salary range in US Dollars'
                  : 'Enter your expected hourly rate in US Dollars'}
              </p>
            </div>

            {/* Tax Type - Multiple Selection */}
            <div className="space-y-2">
              <Label>Tax Type Preferences * (Select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {TAX_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={formData.tax_types?.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer px-4 py-2 transition-colors ${
                      formData.tax_types?.includes(type) 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'hover:bg-green-500/10'
                    }`}
                    onClick={() => toggleTaxType(type)}
                  >
                    {formData.tax_types?.includes(type) && <Check className="w-3 h-3 mr-1" />}
                    {type}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                W2: Full-time employee | 1099: Independent contractor | C2C/Corp-to-Corp: Through your own company
              </p>
            </div>

            {/* Job Type */}
            <div className="space-y-2">
              <Label>Work Arrangement Preferences</Label>
              <div className="flex gap-2">
                {JOB_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={formData.job_type_preferences.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer px-4 py-2 transition-colors ${
                      formData.job_type_preferences.includes(type) 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'hover:bg-blue-500/10'
                    }`}
                    onClick={() => toggleJobType(type)}
                  >
                    {formData.job_type_preferences.includes(type) && <Check className="w-3 h-3 mr-1" />}
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Relocation */}
            <div className="space-y-2">
              <Label>Open to Relocation?</Label>
              <Select
                value={formData.relocation_preference}
                onValueChange={(value) => setFormData({ ...formData, relocation_preference: value })}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  {RELOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Locations */}
            <div className="space-y-2 relative">
              <Label>Preferred Work Locations</Label>
              <Input
                value={prefLocationInput}
                onChange={(e) => handlePrefLocationChange(e.target.value)}
                onFocus={() => prefLocationInput && setShowPrefLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPrefLocationSuggestions(false), 200)}
                placeholder="Add preferred locations..."
              />
              {showPrefLocationSuggestions && prefLocationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {prefLocationSuggestions.map((city) => (
                    <button
                      key={city}
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm"
                      onMouseDown={() => addPrefLocation(city)}
                    >
                      <MapPin className="w-3 h-3 inline mr-2 text-muted-foreground" />
                      {city}
                    </button>
                  ))}
                </div>
              )}
              {formData.location_preferences.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.location_preferences.map((city) => (
                    <Badge key={city} variant="secondary" className="pr-1">
                      {city}
                      <button
                        type="button"
                        onClick={() => removePrefLocation(city)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;
