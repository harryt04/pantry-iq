import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import your inventory and order data to PantryIQ.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-muted-foreground flex items-center justify-center rounded-lg border-2 border-dashed p-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button variant="outline">Select File</Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Import features will be available soon. References: WU-2.2, WU-2.3,
            WU-2.4
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
