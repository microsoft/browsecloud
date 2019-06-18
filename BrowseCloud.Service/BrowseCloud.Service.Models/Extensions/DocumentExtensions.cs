// <copyright file="DocumentExtensions.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Extensions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;

    /// <summary>
    /// Extensions for the Document entity.
    /// </summary>
    public static class DocumentExtensions
    {
        /// <summary>
        /// Determines if the user can read the document.
        /// </summary>
        /// <param name="doc">Document</param>
        /// <param name="ids">The IDs the user goes by (user ID and group IDs).</param>
        /// <returns></returns>
        public static bool UserCanRead(this Document doc, IEnumerable<string> ids)
        {
            if (doc == null)
            {
                return false;
            }

            return ids.Contains(doc.Owner.Id, StringComparer.InvariantCultureIgnoreCase)
                || doc.Acl.Any((u) => ids.Contains(u.Id, StringComparer.InvariantCultureIgnoreCase))
                || doc.IsPublic == true;
        }

        /// <summary>
        /// Determines if the user can modify the document.
        /// </summary>
        /// <param name="doc">Document</param>
        /// <param name="ids">The IDs the user goes by (user ID and group IDs).</param>
        /// <returns></returns>
        public static bool UserCanModify(this Document doc, IEnumerable<string> ids)
        {
            if (doc == null)
            {
                return false;
            }

            return ids.Contains(doc.Owner.Id, StringComparer.InvariantCultureIgnoreCase)
                || doc.Acl.Any((u) => ids.Contains(u.Id, StringComparer.InvariantCultureIgnoreCase));
        }

        /// <summary>
        /// Get the training file name for the document.
        /// </summary>
        /// <param name="doc">Document</param>
        /// <param name="fileName">File name for the input file</param>
        /// <returns></returns>
        public static string BlobFileName(this Document doc, string fileName = "input")
        {
            if (doc == null)
            {
                return null;
            }

            return doc.InputType == InputType.SimpleInput ? $"{fileName}.txt" : $"{fileName}.csv";
        }
    }
}
