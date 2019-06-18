// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserialize, autoserializeAs, SerializableEnumeration } from 'cerialize';

export enum UserIdentityType {
    User,
    Group,
}
SerializableEnumeration(UserIdentityType);

/** Represents a document to be trained. */
export class BrowseCloudUserIdentity {
    @autoserialize public id: string;
    @autoserialize public displayName: string;
    @autoserialize public principalName: string;
    @autoserializeAs(UserIdentityType) public type: UserIdentityType;
}
