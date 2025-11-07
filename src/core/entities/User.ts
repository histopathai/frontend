import { UserStatus } from '../value-objects/UserStatus';
import { UserRole } from '../value-objects/UserRole';

export interface UserProps {
  uid: string;
  email: string;
  displayName: string;
  status: UserStatus;
  role: UserRole;
  adminApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvalDate?: Date;
}

export class User {
    private constructor(private props: UserProps) {}

    static create(data: {
    uid: string;
    email: string;
    displayName: string;
    status: string;
    role: string;
    adminApproved: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    approvalDate?: string | Date;
  }): User {
    return new User({
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      status: UserStatus.fromString(data.status),
      role: UserRole.fromString(data.role),
      adminApproved: data.adminApproved,
      createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt,
      approvalDate: data.approvalDate 
        ? typeof data.approvalDate === 'string' ? new Date(data.approvalDate) : data.approvalDate
        : undefined
    });
  }

    get uid(): string {
        return this.props.uid;
    }

    get email(): string {
        return this.props.email;
    }

    get displayName(): string {
        return this.props.displayName;
    }

    get status(): UserStatus {
        return this.props.status;
    }

    get role(): UserRole {
        return this.props.role;
    }

    get adminApproved(): boolean {
        return this.props.adminApproved;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    get approvalDate(): Date | undefined {
        return this.props.approvalDate;
    }

    canAccessSystem(): boolean {
        return this.props.status.isActive() && this.props.adminApproved;
    }

    needsApproval(): boolean {
        return this.props.status.isPending() && !this.props.adminApproved;
    }

    isAdmin(): boolean {
        return this.props.role.isAdmin();
    }
    
    // Serialization
    toJSON() {
        return {
            uid: this.uid,
            email: this.email,
            displayName: this.displayName,
            status: this.status.toString(),
            role: this.role.toString(),
            adminApproved: this.adminApproved,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            approvalDate: this.approvalDate?.toISOString()
        };
    }
  }

  