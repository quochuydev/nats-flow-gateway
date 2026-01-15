import { FlowException, UserInfo } from '../types/flow';

type RoleCheckParams = {
  userinfo?: UserInfo;
  roles?: Array<'admin' | 'customer'>;
};

export const isValidRole = ({ userinfo, roles }: RoleCheckParams = {}): UserInfo => {
  if (!userinfo) {
    throw new FlowException(401, 'UNAUTHORIZED', 'Not authenticated');
  }
  if (roles && !roles.includes(userinfo.role)) {
    throw new FlowException(403, 'FORBIDDEN', `Required role: ${roles.join(' or ')}`);
  }
  return userinfo;
};
