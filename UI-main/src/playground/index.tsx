import { useState } from 'react';
import {
  Button,
  Badge,
  Avatar,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  SearchInput,
  NavItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Logo,
  WorkspaceSwitcher,
  TopicTag,
} from '../components/ui';
import { Home, Search, Bell, User } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

export default function Playground() {
  const [searchValue, setSearchValue] = useState('');
  const [tabValue, setTabValue] = useState('account');
  const [workspaceId, setWorkspaceId] = useState('ws-1');

  const workspaces = [
    { id: 'ws-1', name: 'Independent workspace', memberName: 'Sam Lee', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop' },
    { id: 'ws-2', name: 'Design team', memberName: 'Alice Chen' },
    { id: 'ws-3', name: 'Dev squad', memberName: 'Marcus J.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">UI Playground</h1>
        </div>
        <a href="#/" className="text-sm text-gray-500 hover:text-gray-900">Back to app</a>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <Section title="Button">
          <Row>
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row>
            <Button shape="square">Square</Button>
            <Button disabled>Disabled</Button>
          </Row>
        </Section>

        <Section title="Badge">
          <Row>
            <Badge>Default</Badge>
            <Badge variant="blue">Blue</Badge>
            <Badge variant="green">Green</Badge>
            <Badge variant="orange">Orange</Badge>
            <Badge variant="red">Red</Badge>
            <Badge variant="pink">Pink</Badge>
          </Row>
          <Row>
            <Badge size="sm">Small</Badge>
            <Badge size="md" shape="default">Squared</Badge>
          </Row>
        </Section>

        <Section title="Avatar">
          <Row>
            <Avatar size="xs" fallback="A" />
            <Avatar size="sm" fallback="A" />
            <Avatar size="md" fallback="A" />
            <Avatar size="lg" fallback="A" />
            <Avatar size="xl" fallback="A" />
          </Row>
          <Row>
            <Avatar src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" fallback="S" size="lg" />
            <Avatar src="https://broken-url.jpg" fallback="B" size="lg" />
          </Row>
        </Section>

        <Section title="Card">
          <Row>
            <Card className="w-64">
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>This is a description text.</CardDescription>
              </CardHeader>
              <CardContent className="mt-3">
                <p className="text-sm text-gray-600">Card content goes here.</p>
              </CardContent>
            </Card>
            <Card padding="sm" shadow="md" radius="md" className="w-48">
              <p className="text-sm text-gray-700">Small padding, medium shadow</p>
            </Card>
          </Row>
        </Section>

        <Section title="Input">
          <Row>
            <Input placeholder="Default input" className="w-64" />
            <Input variant="ghost" placeholder="Ghost input" className="w-64" />
          </Row>
          <Row>
            <Input size="sm" placeholder="Small" className="w-48" />
            <Input size="md" placeholder="Medium" className="w-48" />
            <Input size="lg" placeholder="Large" className="w-48" />
          </Row>
          <Row>
            <Input state="error" placeholder="Error state" className="w-64" />
            <Input disabled placeholder="Disabled" className="w-64" />
          </Row>
        </Section>

        <Section title="SearchInput">
          <Row>
            <SearchInput
              placeholder="Search..."
              className="w-72"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClear={() => setSearchValue('')}
            />
            <SearchInput size="sm" placeholder="Small search" className="w-56" />
            <SearchInput size="lg" placeholder="Large search" className="w-80" />
          </Row>
        </Section>

        <Section title="NavItem">
          <div className="w-56 bg-white border border-gray-100 rounded-xl p-2">
            <NavItem icon={Home} label="Home" />
            <NavItem icon={Search} label="Search" active />
            <NavItem icon={Bell} label="Notifications" badge="3" />
            <NavItem icon={User} label="Profile" size="compact" />
          </div>
        </Section>

        <Section title="Tabs">
          <div className="w-full max-w-md">
            <Tabs value={tabValue} onValueChange={setTabValue}>
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account">Account settings content.</TabsContent>
              <TabsContent value="password">Password settings content.</TabsContent>
              <TabsContent value="settings">General settings content.</TabsContent>
            </Tabs>
          </div>
          <div className="w-full max-w-md mt-4">
            <Tabs value={tabValue} onValueChange={setTabValue} variant="underline">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account">Account settings content.</TabsContent>
              <TabsContent value="password">Password settings content.</TabsContent>
              <TabsContent value="settings">General settings content.</TabsContent>
            </Tabs>
          </div>
        </Section>

        <Section title="Logo">
          <Row>
            <Logo size="sm" />
            <Logo size="md" />
            <Logo size="lg" />
            <div className="bg-gray-900 p-2 rounded"><Logo size="md" tone="inverted" /></div>
          </Row>
        </Section>

        <Section title="WorkspaceSwitcher">
          <div className="w-64">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeId={workspaceId}
              onSelect={setWorkspaceId}
            />
          </div>
        </Section>

        <Section title="TopicTag">
          <Row>
            <TopicTag>Design</TopicTag>
            <TopicTag variant="filled">Development</TopicTag>
            <TopicTag variant="active">Marketing</TopicTag>
          </Row>
          <Row>
            <TopicTag size="sm" onRemove={() => {}}>Removable</TopicTag>
            <TopicTag variant="filled" onRemove={() => {}}>Removable</TopicTag>
            <TopicTag variant="active" size="sm">Small active</TopicTag>
          </Row>
        </Section>
      </main>
    </div>
  );
}
