// <copyright file="DirectoryIdentity.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models
{
    using System.Runtime.Serialization;

    /// <summary>
    /// The type of the id in AclEntry.
    /// </summary>
    public enum DirectoryIdentityType
    {
        /// <summary>
        /// The id is a user principal name.
        /// </summary>
        User,

        /// <summary>
        /// The id is a group principal name.
        /// </summary>
        Group,
    }

    /// <summary>
    /// Document ACL entry.
    /// </summary>
    [DataContract]
    public class DirectoryIdentity
    {
        /// <summary>
        /// The principal name (id) of the user or group.
        /// </summary>
        [DataMember(Name = "id")]
        public string Id { get; set; }

        /// <summary>
        /// The display name of the user or group.
        /// </summary>
        [DataMember(Name = "displayName")]
        public string DisplayName { get; set; }

        /// <summary>
        /// The principal name of the user or group.
        /// </summary>
        [DataMember(Name = "principalName")]
        public string PrincipalName { get; set; }

        /// <summary>
        /// What the type of the identifier is above.
        /// </summary>
        [DataMember(Name = "type")]
        public DirectoryIdentityType Type { get; set; }

        /// <summary>
        /// Test to see if all fields are equal.
        /// </summary>
        /// <param name="user">User to check</param>
        /// <returns></returns>
        public bool EqualsDirectoryIdentity(DirectoryIdentity user)
        {
            if (user == null)
            {
                return false;
            }

            return this.Id == user.Id && this.DisplayName == user.DisplayName && this.PrincipalName == user.PrincipalName && this.Type == user.Type;
        }
    }
}
