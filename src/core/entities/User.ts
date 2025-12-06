import { UserStatus } from '../value-objects/UserStatus';
import { UserRole } from '../value-objects/UserRole';

export interface UserProps {
  userId: string;
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
    user_id: string;
    email: string;
    display_name: string;
    status: string;
    role: string;
    admin_approved: boolean;
    created_at: string | Date;
    updated_at: string | Date;
    approval_date?: string | Date;
  }): User {
    return new User({
      userId: data.user_id,
      email: data.email,
      displayName: data.display_name,
      status: UserStatus.fromString(data.status),
      role: UserRole.fromString(data.role),
      adminApproved: data.admin_approved,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
      approvalDate: data.approval_date
        ? typeof data.approval_date === 'string'
          ? new Date(data.approval_date)
          : data.approval_date
        : undefined,
    });
  }

  get userId(): string {
    return this.props.userId;
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

  public get initials(): string {
    if (this.displayName) {
      return this.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (this.email) {
      return this.email.charAt(0).toUpperCase();
    }
    return '?';
  }

  // Serialization
  toJSON() {
    return {
      userId: this.userId,
      email: this.email,
      displayName: this.displayName,
      status: this.status.toString(),
      role: this.role.toString(),
      adminApproved: this.adminApproved,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      approvalDate: this.approvalDate?.toISOString(),
    };
  }
}
