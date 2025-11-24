export interface CycloneDXBOM {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  version: number;
  metadata?: {
    timestamp?: string;
    tools?: Array<{ name: string; version: string }>;
    component?: Component;
  };
  components?: Component[];
  dependencies?: Dependency[];
}

export interface Component {
  type: "application" | "library" | "framework" | "container";
  "bom-ref"?: string;
  name: string;
  version?: string;
  purl?: string;
  licenses?: Array<{
    license?: { id?: string; name?: string };
    expression?: string;
  }>;
}

export interface Dependency {
  ref: string;
  dependsOn?: string[];
}

export interface ScanOptions {
  path: string;
  image?: string;
  output: string;
  policy: string;
  summary: string;
  markdown?: string;
  failOnViolation: boolean;
  quiet: boolean;
}

export interface Summary {
  timestamp: string;
  components: number;
  licenses: {
    permissive: number;
    copyleft: number;
    proprietary: number;
    unknown: number;
  };
  risk: {
    red: number;
    yellow: number;
    green: number;
  };
  violations: Array<{ component: string; reason: string; severity: string }>;
}
