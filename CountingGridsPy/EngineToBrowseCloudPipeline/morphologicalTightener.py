# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from skimage.morphology import label
from skimage.measure import regionprops
import numpy as np


class MorphologicalTightener():
    @staticmethod
    def tighten_pi(pi):
        '''
        Algorithm:
        1. Go through each word in the vocabulary stored in pi params.
        2. Find all connected components within the
        the 2-d plane for the given feature, which is like an image.
        3. Within each component find the index with highest probability.
        4. Set the probability of all other elements
        in the component set to be 0.
        '''
        pi = np.copy(pi)
        Z = pi.shape[2]
        for z in range(Z):
            tmp_pi = pi[:, :, z]
            labelled_components = label(
                tmp_pi > 1e-3,
                neighbors=None,
                background=None,
                return_num=False,
                connectivity=1
            )
            for region in regionprops(labelled_components):
                x_coords = region.coords[:, 0]
                y_coords = region.coords[:, 1]
                vals = tmp_pi[x_coords, y_coords]
                i_max = np.argmax(vals)
                maxval = tmp_pi[np.array(region.coords[i_max, :][0]), np.array(
                    region.coords[i_max, :][1])]
                tmp_pi[x_coords, y_coords] = 0
                tmp_pi[np.array(region.coords[i_max, :][0]), np.array(
                    region.coords[i_max, :][1])] = maxval

            pi[:, :, z] = tmp_pi
        return pi

    @staticmethod
    def tighten_q():
        pass

    @staticmethod
    def print_results(input, output):
        assert(np.all(input.shape == output.shape))
        for z in range(input.shape[2]):
            print("Feature index " + str(z) + ":")
            print("Input:")
            print(input[:, :, z])
            print("Output:")
            print(output[:, :, z])
            print("")


if __name__ == "__main__":
    # test1
    INPUT = np.array(
        [
            [
                [0.5, 0.5, 0, 0],
                [0.7, 0, 0, 0.5],
                [0.5, 0, 0, 0.6],
                [0.5, 0, 0.5, 0]
            ],
            [
                [0.004, 0.5, 0, 0],
                [0.5, 0, 0, 0],
                [100, 0, 0, 0],
                [0, 0, 0, 0.5]
            ]
        ]).astype(float).transpose((1, 2, 0))

    OUTPUT = np.array(
        [
            [
                [0, 0, 0, 0],
                [0.7, 0, 0, 0],
                [0, 0, 0, 0.6],
                [0, 0, 0.5, 0]
            ],
            [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [100, 0, 0, 0],
                [0, 0, 0, 0.5]
            ]
        ]
    ).astype(float).transpose((1, 2, 0))

    assert(np.all(MorphologicalTightener.tighten_pi(INPUT) == OUTPUT))

    MorphologicalTightener.print_results(
        INPUT,
        MorphologicalTightener.tighten_pi(INPUT)
    )
