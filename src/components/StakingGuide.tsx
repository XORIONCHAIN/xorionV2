import React,{ useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FaGraduationCap, FaArrowRight, FaArrowLeft, FaCheck, FaShieldAlt, FaSearch, FaCoins, FaChartLine, FaUnlock } from 'react-icons/fa';

const steps = [
  {
    title: "What is Staking?",
    content: "Staking is the process of participating in a blockchain network by locking up your tokens to help secure the network. In return, you earn rewards for your contribution.",
    icon: FaShieldAlt
  },
  {
    title: "Choose a Validator",
    content: "Select a validator based on their commission rate, uptime, and reputation. A good validator should have high uptime, reasonable commission, and a strong track record.",
    icon: FaSearch
  },
  {
    title: "Stake Your Tokens",
    content: "Decide how many tokens you want to stake. Remember that staked tokens are locked and cannot be transferred until you undelegate them.",
    icon: FaCoins
  },
  {
    title: "Monitor Rewards",
    content: "Track your staking rewards and validator performance. You can claim your rewards at any time, but remember that claiming too frequently may incur higher transaction fees.",
    icon: FaChartLine
  },
  {
    title: "Undelegation Process",
    content: "When you want to withdraw your tokens, you'll need to undelegate them. This process includes an unbonding period during which your tokens remain locked.",
    icon: FaUnlock
  }
];

export default function StakingGuide()  {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center space-x-2">
          <FaGraduationCap className="w-5 h-5 text-primary" />
          <span>Staking Guide</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} className="h-2" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {React.createElement(steps[currentStep].icon, { className: "w-6 h-6 text-primary" })}
            <h3 className="text-lg font-semibold text-foreground">{steps[currentStep].title}</h3>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          {steps[currentStep].content}
        </p>

        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button className="flex items-center space-x-2 bg-primary hover:bg-primary/90">
              <FaCheck className="w-4 h-4" />
              <span>Complete Guide</span>
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
            >
              <span>Next</span>
              <FaArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 pt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

