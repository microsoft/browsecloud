// <copyright file="IGraphService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.Graph
{
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models;
    using Microsoft.Graph;

    /// <summary>
    /// Service to interface with the Microsoft Graph API
    /// </summary>
    public interface IGraphService
    {
        /// <summary>
        /// Gets a graph user by guid or principal name
        /// </summary>
        /// <param name="idOrPrincipalName">user to find</param>
        /// <returns></returns>
        Task<User> GetUser(string idOrPrincipalName);

        /// <summary>
        /// Get a list of group ids for the current user
        /// </summary>
        /// <returns></returns>
        Task<IEnumerable<string>> GetCurrentUserGroups();

        /// <summary>
        /// Get a list of group ids for the current user plus the user id
        /// </summary>
        /// <returns></returns>
        Task<IEnumerable<string>> GetAllCurrentUserIdentities();

        /// <summary>
        /// Gets either groups or users by ID.
        /// </summary>
        /// <param name="ids">user or group ids</param>
        /// <returns></returns>
        Task<IEnumerable<DirectoryIdentity>> GetDirectoryIdentities(IEnumerable<string> ids);

        /// <summary>
        /// Gets a group or user by ID
        /// </summary>
        /// <param name="id">Group or User Id</param>
        /// <returns></returns>
        Task<DirectoryIdentity> GetDirectoryIdentity(string id);
    }
}
