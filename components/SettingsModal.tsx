import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SettingsModalProps {
  onSave: (settings: any) => void
  initialSettings: any
}

export default function SettingsModal({ onSave, initialSettings }: SettingsModalProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  const handleSave = () => {
    onSave(settings)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          ⚙️ Profile & Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Patient Profile & API Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">Patient Profile</h3>
            <div className="grid gap-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" value={settings.age} onChange={(e) => setSettings({ ...settings, age: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">Base Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={settings.weight} onChange={(e) => setSettings({ ...settings, weight: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="disease">Pre-existing Condition</Label>
              <Select value={settings.disease} onValueChange={(val) => setSettings({ ...settings, disease: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Heart">Heart Disease</SelectItem>
                  <SelectItem value="Asthma">Asthma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2 pt-4 border-t border-border">
            <h3 className="font-medium text-sm text-muted-foreground">ThingSpeak Configuration</h3>
            <div className="grid gap-2">
              <Label htmlFor="channelId">Channel ID</Label>
              <Input id="channelId" value={settings.channelId} onChange={(e) => setSettings({ ...settings, channelId: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="readKey">Read API Key</Label>
              <Input id="readKey" type="password" value={settings.readKey} onChange={(e) => setSettings({ ...settings, readKey: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border flex items-center justify-between">
            <div>
              <Label htmlFor="demoMode" className="text-base font-medium">Developer Demo Mode</Label>
              <p className="text-xs text-muted-foreground">Enable to simulate data for presentations.</p>
            </div>
            <Switch 
              id="demoMode" 
              checked={settings.demoMode || false} 
              onCheckedChange={(checked) => setSettings({ ...settings, demoMode: checked })} 
            />
          </div>

        </div>
        <Button onClick={handleSave} className="w-full">Save Settings</Button>
      </DialogContent>
    </Dialog>
  )
}
