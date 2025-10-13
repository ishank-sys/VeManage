import { useState } from "react";
import { UserPlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for resources
const resources = [
  {
    id: 1,
    name: "John Smith",
    role: "Senior Engineer",
    availability: "Available",
    currentProjects: 2,
    skills: ["AutoCAD", "Structural Analysis"],
  },
  {
    id: 2,
    name: "Sarah Johnson",
    role: "Project Manager",
    availability: "Busy",
    currentProjects: 3,
    skills: ["Project Management", "Quality Control"],
  },
  {
    id: 3,
    name: "Mike Chen",
    role: "Design Engineer",
    availability: "Available",
    currentProjects: 1,
    skills: ["3D Modeling", "MEP Design"],
  },
  {
    id: 4,
    name: "Emma Wilson",
    role: "BIM Specialist",
    availability: "On Leave",
    currentProjects: 0,
    skills: ["Revit", "BIM Coordination"],
  },
  {
    id: 5,
    name: "David Brown",
    role: "Quality Inspector",
    availability: "Available",
    currentProjects: 2,
    skills: ["Quality Assurance", "Documentation"],
  },
];

const getAvailabilityColor = (availability: string) => {
  switch (availability) {
    case "Available":
      return "bg-success text-success-foreground";
    case "Busy":
      return "bg-warning text-warning-foreground";
    case "On Leave":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

export function ResourcesPanel() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Available Resources</CardTitle>
          <Button size="sm" variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Temporarily commented out - will be replaced with resource allocation features */}
        {/* <div className="space-y-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {resource.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{resource.name}</div>
                  <div className="text-sm text-muted-foreground">{resource.role}</div>
                  <div className="flex gap-1 mt-1">
                    {resource.skills.slice(0, 2).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <Badge className={getAvailabilityColor(resource.availability)}>
                    {resource.availability}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {resource.currentProjects} projects
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Assign to Project</DropdownMenuItem>
                    <DropdownMenuItem>Edit Availability</DropdownMenuItem>
                    <DropdownMenuItem>View Schedule</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div> */}
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">
            Resource management features coming soon
          </div>
        </div>
      </CardContent>
    </Card>
  );
}