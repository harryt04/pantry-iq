import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Check, AlertCircle } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            <AlertCircle className="h-4 w-4" />
            Beta Experience
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground text-xl">
            Choose the plan that works best for your restaurant
          </p>
          <p className="text-muted-foreground mt-4 text-sm">
            Pricing shown below reflects our current beta offering and may
            change at official launch.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Starter Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Starter</CardTitle>
              <CardDescription>For small operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3">
                {['Up to 100 items', 'Basic forecasting', 'Email support'].map(
                  (feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ),
                )}
              </ul>
              <Button className="mt-6 w-full">Get Started</Button>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="border-primary relative md:scale-105">
            <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-semibold">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle>Professional</CardTitle>
              <CardDescription>For growing restaurants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Unlimited items',
                  'Advanced forecasting',
                  'Priority support',
                  'API access',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full">Get Started</Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>For large operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Everything in Pro',
                  'Custom integrations',
                  'Dedicated support',
                  'On-premise option',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-6 w-full">
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
